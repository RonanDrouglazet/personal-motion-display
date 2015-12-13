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
story_duration = 60 #s
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

    def clean(self):
        print 'clean'
        keep = self.queue[-2::]
        for video in self.queue:
            if video not in keep:
                print('rm ' + video)
                subprocess.call(['rm', video])
        self.queue = keep
        return self.queue

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
                self.queue.append(str((now - 2)) + '.h264')
                self.queue.append(str(now) + '.h264')
                # Warn everyone
                self.event_motion.set()


    def detect_motion(self, camera):
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

    def __init__(self, videos, clean_motion_queue):
        Thread.__init__(self)
        self.videos = videos
        self.hd_ext = '-HD.mp4'
        self.clean_motion_queue = clean_motion_queue

    def run(self):
        with storyLock:
            now = math.ceil(time.time())
            # if under story duration, it's a story resume
            if (now - story_time) < story_duration :
                print('story resume')
                self.encode_hd()
            # else we have a new story
            else:
                print('story create')
                self.init_story(now)
                self.write_image()
                # if it's not the first story, clean previous queue
                if len(self.videos) > 2:
                    self.videos = self.clean_motion_queue()
                self.encode_hd()

    def init_story(self, now):
        story_time = now
        story_name = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        print story_name

    def write_image(self):
        cv2.imwrite(motion_path + story_name + '.jpg', prior_image)

    def encode_hd(self):
        main_video = motion_path + story_name + self.hd_ext
        
        source = '|'.join(self.videos)
        print source
        
        subprocess.call(['avconv', '-i', 'concat:' + source, '-c', 'copy','-loglevel', 'error', '-y', main_video])
        print('encode finish')


class SDEncode(Thread):

    def __init__(self, camera):
        Thread.__init__(self)
        self.camera = camera
        self.event_kill = threading.Event()

    def run(self):
        while not self.event_kill.is_set():
            now = math.ceil(time.time())
            if story_time and (story_time + story_duration) < now:
                print ('encode SD')
            else
                camera.wait_recording(story_duration * 0.1)
        
        #with lockSDEncode:
        #    subprocess.call(['avconv', '-i', motion_path + self.name + '-HD.mp4', '-b', '500k', motion_path + self.name + '-SD.mp4'])

with picamera.PiCamera() as camera:
    # init camera
    camera.resolution = (1280, 720)
    camera.hflip = True
    camera.vflip = True
    # circular 2 second stream 
    stream = picamera.PiCameraCircularIO(camera, seconds=2)
    camera.start_recording(stream, format='h264')
    # wait a little, if not, falsy motion are detected
    camera.wait_recording(5)
    try:
        # init motion detector thread
        motion = MotionRecord(camera, stream)
        motion.start()
        sd_encoder = SDEncode(camera)
        sd_encoder.start()
        while not motion.event_kill.is_set():
            # wait for a motion
            motion.event_motion.wait()
            # we have a motion, resume or creat a story
            StoryMaker(motion.queue, motion.clean).start()
            # story work is finish, reset motion event and listen again 
            motion.event_motion.clear()

    finally:
        camera.stop_recording()
        