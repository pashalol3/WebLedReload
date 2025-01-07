#ifndef LED_CONTROLLER
#define LED_CONTROLLER
#include <stdint.h>
#include "FastLED.h"
#include "Point.cpp"
#include "Helper.hpp"
class LedController{
    public:

    LedController(uint8_t width, uint8_t height);
    void Show();
    void FillSolidColor(uint32_t color , bool show = true);
    void SetPixel(uint8_t x, uint8_t y, uint32_t color , bool show = false);
    void DCreatePixels(uint8_t width, uint8_t height);
    void DCreateTranlateMatrix(uint8_t width, uint8_t height);
    void FillTranslateMatrix(Point* refPoints,size_t N);

    uint32_t GetIndex(uint16_t x, uint16_t y);
    uint8_t Width;
    uint8_t Height; 
    CRGB* Pixels = nullptr;

    private:
    uint16_t **TranslateMatrix = nullptr;
};

#endif //LED_CONTROLLER
