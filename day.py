import picamera

with picamera.PiCamera() as camera:
    camera.resolution = (1280, 720)
    camera.vflip = True
    camera.hflip = True
    # Finally, capture an image with a 6s exposure. Due
    # to mode switching on the still port, this will take
    # longer than 6 seconds
    camera.capture('/home/pi/personal-motion-display/motion/day.jpg')
