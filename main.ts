/*
Riven
modified from pxt-servo/servodriver.ts
load dependency
"bmsmotor": "file:../pxt-motor"
*/


//% color="#019858" weight=10 icon="\uf0f9"
namespace bmsmotor {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD


    export enum Servos {
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        S5 = 0x05,
        S6 = 0x06,
        S7 = 0x07,
        S8 = 0x08
    }

    export enum Motors {
        M1A = 0x1,
        M1B = 0x2,
        M2A = 0x3,
        M2B = 0x4
    }


    export enum SonarVersion {
        V1 = 0x1,
        V2 = 0x2
    }



    let initialized = false
    let initializedMatrix = false
    let matBuf = pins.createBuffer(17);
    let distanceBuf = 0;

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        //serial.writeValue("ch", channel)
        //serial.writeValue("on", on)
        //serial.writeValue("off", off)

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }


    function stopMotor(index: number) {
        setPwm((index - 1) * 2, 0, 0);
        setPwm((index - 1) * 2 + 1, 0, 0);
    }




    /**
     * Execute Car Run
     */
    //% blockId=bmsmotor_car_run block="Car-Run|"
    //% weight=99
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarRun(): void {
        MotorRunDual(1, 255, 3, 255);
    }

    /**
     * Execute Car Turn Left
     */
    //% blockId=bmsmotor_car_left block="Car Turn Left|"
    //% weight=98
     //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarTurnLeft(): void {
        MotorRunDual(1, 0, 3, 255);
    }


    /**
     * Execute Car Turn Right
      */
    //% blockId=bmsmotor_car_right block="Car Turn Right|"
    //% weight=97
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarTurnRight(): void {
        MotorRunDual(1, 255, 3, 0);
    }


    /**
     * Execute Car stop
     */
    //% blockId=bmsmotor_carstop block="Car Stop|"
    //% weight=96
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarStop(): void {
        MotorStopAll();
    }


   /**
     * Execute Car Run with speed
     * @param index Motor Index; eg: M1A, M2A
     * @param speed [-255-255] speed of motor;
     */
    //% blockId=bmsmotor_car_runs block="Car Run|speed %speed|"
    //% weight=95
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarRunwithspeed(speed: number): void {
        MotorRunDual(1, speed, 3, speed);
    }


    /**
     * Execute Car Run with delay stop
     * @param speed [-255-255] speed of motor;
     * @param delay seconde delay to stop; eg: 1
     */
    //% blockId=bmsmotor_car_run_with_delay block="Car Run|speed %speed|delay %delay|s"
    //% weight=94
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarRunwithdelay(speed: number, delay: number): void {
        MotorRunDual(1, speed, 3, speed);
        basic.pause(delay * 1000);
        MotorStopAll();
    }


    /**
     * Execute Car Turn Left with speed
     * @param speed [-255-255] speed of motor;
     */
    //% blockId=bmsmotor_car_turn_left_S block="Car Turn Left|speed %speed|"
    //% weight=93
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarTurnLeftS(speed: number): void {
        MotorRunDual(1, 0, 3, speed);
    }


    /**
     * Execute Car Turn Right with speed
     * @param speed [-255-255] speed of motor;
     */
    //% blockId=bmsmotor_car_turn_right_S block="Car Turn Right|speed %speed|"
    //% weight=92
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function CarTurnRightS(speed: number): void {
        MotorRunDual(1, speed, 3, 0);
    }



    //% blockId=bmsmotor_motor_run block="BMS_Motor|%index|speed %speed"
    //% weight=89
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: Motors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pp = (index - 1) * 2
        let pn = (index - 1) * 2 + 1
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }


    /**
     * Execute single motors with delay
     * @param index Motor Index; eg: M1A, M1B, M2A, M2B
     * @param speed [-255-255] speed of motor; eg: 150, -150
     * @param delay seconde delay to stop; eg: 1
     */
    //% blockId=bmsmotor_motor_rundelay block="Motor|%index|speed %speed|delay %delay|s"
    //% weight=88
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
        MotorRun(index, speed);
        basic.pause(delay * 1000);
        MotorRun(index, 0);
    }


    /**
     * Execute two motors at the same time
     * @param motor1 First Motor; eg: M1A, M1B
     * @param speed1 [-255-255] speed of motor; eg: 150, -150
     * @param motor2 Second Motor; eg: M2A, M2B
     * @param speed2 [-255-255] speed of motor; eg: 150, -150
    */
    //% blockId=bmsmotor_motor_dual block="Motor|%motor1|speed %speed1|%motor2|speed %speed2"
    //% weight=87
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
        MotorRun(motor1, speed1);
        MotorRun(motor2, speed2);
    }






    //% blockId=bmsmotor_stop block="Motor Stop|%index|"
    //% weight=85
    export function MotorStop(index: Motors): void {
        MotorRun(index, 0);
    }


    //% blockId=bmsmotor_stop_all block="Motor Stop All"
    //% weight=84
    //% blockGap=50
    export function MotorStopAll(): void {
        if (!initialized) {
            initPCA9685()
        }
        for (let idx = 1; idx <= 4; idx++) {
            stopMotor(idx);
        }
    }



    /**
     * Servo Execute
     * @param index Servo Channel; eg: S1
     * @param degree [0-180] degree of servo; eg: 0, 90, 180
    */
    //% blockId=bmsmotor_servo block="Servomotor|%index|degree %degree"
    //% weight=70
    //% degree.min=0 degree.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }





    //% blockId=bmsmotor_rgbultrasonic block="Ultrasonic|pin %pin"
    //% weight=10
    export function RgbUltrasonic(pin: DigitalPin): number {
        pins.setPull(pin, PinPullMode.PullNone);
        pins.digitalWritePin(pin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(pin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(pin, 0);

        // read pulse
        let d = pins.pulseIn(pin, PulseValue.High, 25000);
        let ret = d;
        // filter timeout spikes
        if (ret == 0 && distanceBuf != 0) {
            ret = distanceBuf;
        }
        distanceBuf = d;   

        return Math.floor(ret * 9 / 6 / 58);
    }



    //% blockId=bmsmotor_holeultrasonicver block="Ultrasonic|pin %pin|version %v"
    //% weight=10
    export function HoleUltrasonic(pin: DigitalPin): number {

        // send pulse
        pins.setPull(pin, PinPullMode.PullDown);
        pins.digitalWritePin(pin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(pin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(pin, 0);

        // read pulse
        let d = pins.pulseIn(pin, PulseValue.High, 25000);
        let ret = d;
        // filter timeout spikes
        if (ret == 0 && distanceBuf != 0) {
            ret = distanceBuf;
        }

        distanceBuf = d;

        return Math.floor(ret / 40 + (ret / 800));
    }

}
