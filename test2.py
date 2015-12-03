import io
import random
import picamera
import picamera.array
import numpy as np
import cv2
import datetime
import subprocess

prior_image = None

def mse(imageA, imageB):
    # the 'Mean Squared Error' between the two images is the
    # sum of the squared difference between the two images;
    # NOTE: the two images must have the same dimension
    err = np.sum((imageA.astype("float") - imageB.astype("float")) ** 2)
    err /= float(imageA.shape[0] * imageA.shape[1])
    
    # return the MSE, the lower the error, the more "similar"
    # the two images are
    return err

def detect_motion(camera):
    global prior_image
    with picamera.array.PiRGBArray(camera) as picture:
        camera.capture(picture, format='rgb', use_video_port=True)
        if prior_image is None:
            prior_image = cv2.cvtColor(picture.array, cv2.COLOR_RGB2GRAY)
            return False
        else:
            current_image = cv2.cvtColor(picture.array, cv2.COLOR_RGB2GRAY)
            # Compare current_image to prior_image to detect motion
            result = mse(current_image, prior_image) >= 100
            # Once motion detection is done, make the prior image the current
            prior_image = current_image
            return result

def write_video(stream):
    # Write the entire content of the circular buffer to disk. No need to
    # lock the stream here as we're definitely not writing to it
    # simultaneously
    with io.open('before.h264', 'wb') as output:
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

with picamera.PiCamera() as camera:
    camera.resolution = (1280, 720)
    stream = picamera.PiCameraCircularIO(camera, seconds=2)
    camera.start_recording(stream, format='h264')
    try:
        while True:
            camera.wait_recording(1)
            if detect_motion(camera):
                print('Motion detected!')
                # As soon as we detect motion, split the recording to
                # record the frames "after" motion
                camera.split_recording('after.h264')
                # Write the 10 seconds "before" motion to disk as well
                write_video(stream)
                # Wait until motion is no longer detected, then split
                # recording back to the in-memory circular buffer
                while detect_motion(camera):
                    camera.wait_recording(5)
                print('Motion stopped!')
                camera.split_recording(stream)
                subprocess.call(['avconv', '-i', '"concat:before.h264|after.h264" -c copy /motion/' + str(datetime.datetime.now()).replace(' ', '_') + '.mp4'])
                subprocess.call(['rm', './*.h264'])
                print('Encode Finish!')
    finally:
        camera.stop_recording()