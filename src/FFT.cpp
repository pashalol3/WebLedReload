#include "FFT.hpp"

FFT::FFT(uint16_t width, uint16_t height, uint8_t soundPin)
{
    _soundPin = soundPin;
    vInitBuffer(width, height);
}
void FFT::doFFT()
{
    for (size_t i = 0; i < FFT_SAMPLES_COUNT; i++)
    {
        _vReal[i] = static_cast<double>(analogRead(_soundPin));
        // vReal[i] = rand();
        _vImag[i] = 0;
    }
    fftLib->Windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
    fftLib->Compute(FFT_FORWARD);
    fftLib->ComplexToMagnitude();

    for (size_t i = 0; i < FFT_SAMPLES_COUNT; i++)
    {
        _vReal[i] /= 1.0 + i / FFT_SAMPLES_COUNT;
    }
}

void FFT::applyEffect(CRGB *pixels)
{

    FastLED.clear();

    for (uint16_t pos = 0; pos < _width; pos++)
    {
        int posLevel = _vReal[_posOffset[pos]];
        uint16_t linesBetween;
        if (pos > 0 && pos < _width)
        {
            linesBetween = _posOffset[pos] - _posOffset[pos - 1];
            for (uint16_t i = 0; i < linesBetween; i++)
            {
                posLevel += (float)((float)i / linesBetween) * _vReal[_posOffset[pos] - linesBetween + i];
            }
            linesBetween = _posOffset[pos + 1] - _posOffset[pos];
            for (uint16_t i = 0; i < linesBetween; i++)
            {
                posLevel += (float)((float)i / linesBetween) * _vReal[_posOffset[pos] + linesBetween - i];
            }
        }

        if (posLevel > _maxValue)
            _maxValue = posLevel;

        posLevel = posLevel * SMOOTH + _oldPosLevel[pos] * (1 - SMOOTH);
        _oldPosLevel[pos] = posLevel;

        posLevel = map(posLevel, AUDIO_SENSIVITY, _gain, 0, _height);
        posLevel = constrain(posLevel, 0, _height);

        if (posLevel > 0)
        {
            for (int j = 0; j < posLevel; j++)
            {
                uint32_t color = ColorUtilities::Wheel8(j);

                if (pos % 2 == 0)
                    pixels[pos * _height + j] = color;
                else
                    pixels[pos * _height + _height - j - 1] = color;
            }
        }

        if (posLevel > 0 && posLevel > _maxLevel[pos])
        {
            _maxLevel[pos] = posLevel;
            _timeLevel[pos] = millis();
        }

        if (_maxLevel[pos] >= 0)
        {
            if (pos % 2 == 0)
                pixels[pos * _height + _maxLevel[pos]] = MAX_COLOR;
            else
                pixels[pos * _height + _height - _maxLevel[pos] - 1] = MAX_COLOR;
        }

        if (_fallFlag)
        {
            if ((long)millis() - _timeLevel[pos] > FALL_PAUSE)
            {
                if (_maxLevel[pos] >= 0)
                    _maxLevel[pos]--;
            }
        }
    }

    FastLED.show();

    _fallFlag = 0;
    if (millis() - _fallTimer > FALL_DELAY)
    {
        _fallFlag = 1;
        _fallTimer = millis();
    }
}

void FFT::vInitBuffer(uint16_t width, uint16_t height)
{
    _width = width;
    _height = height;
    _maxLevel = new int[width];
    _oldPosLevel = new int[width];
    _timeLevel = new unsigned long[width];
    fftLib = new arduinoFFT(_vReal, _vImag, FFT_SAMPLES_COUNT, SAMPLING_FREQUENCY);
}
