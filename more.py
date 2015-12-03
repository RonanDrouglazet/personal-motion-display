import time
import numpy as np
import picamera
import picamera.array

class DetectMotion(picamera.array.PiMotionAnalysis):
    def analyse(self, a):
        startAt = time.clock()
        a = np.sqrt(
                np.square(a['x'].astype(np.float)) +
                np.square(a['y'].astype(np.float))
            ).clip(0, 255).astype(np.uint8)
        # If there're more than 10 vectors with a magnitude greater
        # than 60, then say we've detected motion
        #print((a > 60).sum())
        if (a > 60).sum() > 3:
            print('Motion detected!')
            self.waitAndWrite()
        #print(time.clock() - startAt)

    def waitAndWrite(self):
        self.wait = True
        self.camera.wait_recording(15)
        with self.stream.
        print(self.stream)

    def setStream(self, stream):
        self.stream = stream

with picamera.PiCamera() as camera:
    with DetectMotion(camera) as output:
        with picamera.PiCameraCircularIO(camera, seconds=20) as stream:
            camera.resolution = (640, 480)
            camera.framerate = 60
            camera.start_preview()
            time.sleep(2)
            camera.start_recording(
                  stream, format='h264', motion_output=output)
            
            while True:
                if output.motion:
                    print('motion')

            camera.stop_recording()
