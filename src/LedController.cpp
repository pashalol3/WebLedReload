#include "LedController.hpp"

LedController::LedController(uint8_t width, uint8_t height)
{
    SetSize(width, height);
}

void LedController::SetSize(uint8_t width, uint8_t height)
{
    Width = width;
    Height = height;
    Pixels = new CRGB[width * height];
    const int LED_PIN = 16; // MOVE THIS
    FastLED.addLeds<WS2812B, LED_PIN, GRB>(Pixels, width * height);
    FastLED.setMaxPowerInVoltsAndMilliamps(5, 2000);
    FastLED.setBrightness(30);
}

void LedController::FillSolidColor(uint32_t color, bool show)
{
    for (size_t i = 0; i < Width * Height; i++)
    {
        Pixels[i] = color;
    }
    if (show)
        FastLED.show();
}

void LedController::Show()
{
    FastLED.show();
}

void LedController::SetPixel(uint8_t x, uint8_t y, uint32_t color, bool show)
{
    // leds[y * width + x] = color;
    uint32_t index = 0;
    if (x % 2 == 0)
        index = x * Height + y;
    else
        index = x * Height + (Height - 1 - y);
    Pixels[index] = color;

    if (show)
        FastLED.show();
}