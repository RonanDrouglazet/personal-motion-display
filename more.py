import io
import random
import picamera
import picamera.array
import numpy as np
import cv2
import math
import time
import datetime
import subprocess
import string
import threading
from threading import Thread, RLock

prior_image = None
story_time = 0
story_name = ''
motion_path = '/home/pi/personal-motion-display/motion/'

lockSDEncode = RLock()
storyLock = RLock()

class MotionRecord(Thread):
    
    def __init__(self, camera, stream):
        Thread.__init__(self)
        self.event_kill = threading.Event()
        self.event_motion = threading.Event()
        self.camera = camera
        self.stream = stream
        self.queue = []

    def run(self):
        while not self.event_kill.is_set():
            if self.detect_motion(camera):
                print('Motion detected!')
                now = math.ceil(time.time())
                # As soon as we detect motion, split the recording to
                # record the frames "after" motion
                camera.split_recording(str(now) + '.h264')
                # Write the 2 seconds "before" motion to disk as well
                self.write_video(self.stream, now - 2)
                # Wait until motion is no longer detected, 
                while self.detect_motion(self.camera):
                    camera.wait_recording(5)
                print('Motion stopped!')
                # then split recording back to the in-memory circular buffer
                camera.split_recording(self.stream)
                # append video to encode in the queue
                self.queue = [str(now) + '.h264', str((now - 2)) + '.h264']
                # Warn everyone
                self.event_motion.set()


    def detect_motion(self, camera):
        global prior_image
        with picamera.array.PiRGBArray(camera) as picture:
            camera.capture(picture, format='rgb', use_video_port=True)
            if prior_image is None:
                prior_image = cv2.cvtColor(picture.array, cv2.COLOR_RGB2GRAY)
                return False
            else:
                current_image = cv2.cvtColor(picture.array, cv2.COLOR_RGB2GRAY)
                # Compare current_image to prior_image to detect motion
                result = self.mse(current_image, prior_image) >= 50
                # Once motion detection is done, make the prior image the current
                prior_image = current_image
                return result

    def mse(self, imageA, imageB):
        # the 'Mean Squared Error' between the two images is the
        # sum of the squared difference between the two images;
        # NOTE: the two images must have the same dimension
        err = np.sum((imageA.astype("float") - imageB.astype("float")) ** 2)
        err /= float(imageA.shape[0] * imageA.shape[1])
        
        # return the MSE, the lower the error, the more "similar"
        # the two images are
        return err

    def write_video(self, stream, name):
        # Write the entire content of the circular buffer to disk. No need to
        # lock the stream here as we're definitely not writing to it
        # simultaneously
        with io.open(str(name) + '.h264', 'wb') as output:
            for frame in stream.frames:
                if frame.frame_type == picamera.PiVideoFrameType.sps_header:
                    stream.seek(frame.position)
                    break
            while True:
                buf = stream.read1()
                if not buf:
                    break
                output.write(buf)
        # Wipe the circular stream once we're done
        stream.seek(0)
        stream.truncate()

class StoryMaker(Thread):

    def __init__(self, videos):
        Thread.__init__(self)
        self.videos = videos
        self.story_duration = 600 #s
        self.hd_ext = '-HD.mp4'

    def run(self):
        global story_time
        with storyLock:
            now = math.ceil(time.time())
            # if under story duration, it's a story resume
            if (now - story_time) < self.story_duration :
                print('story resume')
                self.encode_hd('resume')
            # else we have a new story
            else:
                print('story create')
                self.init_story(now)
                self.write_image()
                self.encode_hd('create')

    def init_story(self, now):
        global story_time, story_name
        story_time = now
        story_name = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")

    def write_image(self):
        global prior_image, motion_path, story_name
        cv2.imwrite(motion_path + story_name + '.jpg', prior_image)

    def encode_hd(self, type):
        global motion_path, story_name
        if type is 'resume':
            self.videos.insert(0, story_name + self.hd_ext)
        source = '|'.join(self.videos)
        print source
        subprocess.call(['avconv', '-i', 'concat:' + source, '-c', 'copy', motion_path + story_name + self.hd_ext])
        for video in self.videos:
            if video is not story_name + self.hd_ext:
                subprocess.call(['rm', video])



class SDEncode(Thread):

    def __init__(self, name):
        Thread.__init__(self)
        self.name = name

    def run(self):
        global motion_path
        with lockSDEncode:
            subprocess.call(['avconv', '-i', motion_path + self.name + '-HD.mp4', '-b', '500k', motion_path + self.name + '-SD.mp4'])

with picamera.PiCamera() as camera:
    camera.resolution = (1280, 720)
    camera.hflip = True
    camera.vflip = True
    stream = picamera.PiCameraCircularIO(camera, seconds=2)
    camera.start_recording(stream, format='h264')
    camera.wait_recording(5)
    try:
        #print('start motionrecord')
        #while True:
            #if detect_motion(camera):
                #print('Motion detected!')
                #time = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
                # As soon as we detect motion, split the recording to
                # record the frames "after" motion
                #camera.split_recording('after.h264')
                # Write the 10 seconds "before" motion to disk as well
                #write_video(stream)
                # Write the motion poster
                #cv2.imwrite(motion_path + time + '.jpg', prior_image)
                # Wait until motion is no longer detected, then split
                # recording back to the in-memory circular buffer
                #while detect_motion(camera):
                #    camera.wait_recording(5)
                #print('Motion stopped!')
                #camera.split_recording(stream)
                #subprocess.call(['avconv', '-i', 'concat:before.h264|after.h264', '-c', 'copy', motion_path + time + '-HD.mp4'])
                #subprocess.call(['rm', 'before.h264', 'after.h264'])
                #print('Start SD!')
                #SDEncode(time).start()
                #print('Encode Finish!')

        motion = MotionRecord(camera, stream)
        motion.start()
        
        while not motion.event_kill.is_set():
            motion.event_motion.wait()
            #todo create/reset a timer for the "story" (e.g 10mn)
            # if the timer is null, new story so write image, else it's a story resume
            StoryMaker(motion.queue).start()
            motion.event_motion.clear()

    finally:
        camera.stop_recording()
        