#ifndef FFT_AUDIO_EFFECT_HPP
#define FFT_AUDIO_EFFECT_HPP

#include <memory>
#include "FastLED.h"
#include "arduinoFFT.h"
#include "ColorUtilities.hpp"

class FFT
{
public:
    FFT(uint16_t width, uint16_t height, uint8_t soundPin);
    void doFFT();
    void applyEffect(CRGB *pixels);



private:
    void vInitBuffer(uint16_t width, uint16_t height);

    arduinoFFT *fftLib;
    uint16_t _width;
    uint16_t _height;
    int *_maxLevel;
    int *_oldPosLevel;
    unsigned long *_timeLevel;
    uint8_t _soundPin;
    unsigned long _fallTimer = 0;
    boolean _fallFlag = false;
    int _maxValue = 0;
    int _gain = 0;
    static constexpr int FFT_SAMPLES_COUNT = 128;
    static constexpr int SAMPLING_FREQUENCY = 8000;
    static constexpr float SMOOTH = 0.3f;
    static constexpr int DELAY = 4;
    static constexpr int FALL_DELAY = 50;
    static constexpr int FALL_PAUSE = 700;
    static constexpr int AUDIO_SENSIVITY = 20;
    static constexpr uint32_t MAX_COLOR = 0x0000FF;

    double _vReal[FFT_SAMPLES_COUNT];
    double _vImag[FFT_SAMPLES_COUNT];
    uint8_t _posOffset[17] = {2, 3, 4, 6, 8, 10, 12, 14, 16, 20, 25, 30, 35, 60, 80, 100, 120}; //hz
};

#endif // FFT_AUDIO_EFFECT_HPP