#ifndef LED_CONTROLLER
#define LED_CONTROLLER
#include <stdint.h>
#include "FastLED.h"
class LedController{
    public:

    LedController(uint8_t width, uint8_t height);
    void Show();
    void FillSolidColor(uint32_t color , bool show = true);
    void SetPixel(uint8_t x, uint8_t y, uint32_t color , bool show = false);
    uint8_t Width;
    uint8_t Height; 
    CRGB* Pixels;

    private:
    void SetSize(uint8_t width , uint8_t height);
};

#endif //LED_CONTROLLER
