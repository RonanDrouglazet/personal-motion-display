import picamera
import time

with picamera.PiCamera() as camera:
    camera.resolution = (1280, 720)
    camera.vflip = True
    camera.hflip = True
    camera.start_preview()
    # Camera warm-up time
    time.sleep(2)
    camera.capture('/home/pi/personal-motion-display/motion/day.jpg')
