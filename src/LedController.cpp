#include "LedController.hpp"

void LedController::DCreatePixels(uint8_t width, uint8_t height)
{
    if (Pixels != nullptr)
        delete[] Pixels;
    Pixels = new CRGB[width * height];
}

void LedController::DCreateTranlateMatrix(uint8_t width, uint8_t height)
{
    if (TranslateMatrix != nullptr)
    {
        for (int i = 0; i < Height; ++i)
        {
            delete[] TranslateMatrix[i];
        }
        delete[] TranslateMatrix;
    }

    TranslateMatrix = new uint16_t *[height];
    for (int i = 0; i < height; ++i)
    {
        TranslateMatrix[i] = new uint16_t[width];
        std::fill(TranslateMatrix[i], TranslateMatrix[i] + width, 0);
    }
}

void LedController::FillTranslateMatrix(Point *refPoints, size_t N)
{
    Helper::Assert(N % 2 == 0, "N % 2 must be zero");
    Helper::Assert(refPoints != nullptr, "refPoints cant be nullptr");
    size_t ledIndex = 0;
    for (size_t i = 0; i < N; i += 2)
    {
        Point start = refPoints[i];
        Point end = refPoints[i + 1];
        bool isHorizontal = (start.Y == end.Y);

        uint16_t startPos = isHorizontal ? start.X : start.Y;
        uint16_t endPos = isHorizontal ? end.X : end.Y;

        int8_t step = startPos < endPos ? 1 : -1;

        for (size_t j = startPos; j != endPos + step; j += step)
        {
            uint16_t x = isHorizontal ? j : start.X; 
            uint16_t y = isHorizontal ? start.Y : j;
            Helper::Assert(x < Width, "x=%d but max value =%d", x, Width);
            Helper::Assert(y < Height, "y=%d but max value =%d", y, Height);
            TranslateMatrix[x][y] = ledIndex++;
        }
    }

    // for (size_t x = 0; x < Width; x++)
    // {
    //     for (size_t y = 0; y < Height; y++)
    //     {
    //         Serial.printf("%04d\t", TranslateMatrix[x][y]);
    //     }
    //     Serial.print("\n");
    // }
}

uint32_t LedController::GetIndex(uint16_t x, uint16_t y)
{
    // Negative value will be converted to uint value
    assert(x <= Width && y <= Height);
    uint32_t index = TranslateMatrix[x][y];
    return index;
}

LedController::LedController(uint8_t width, uint8_t height)
{
    Width = width;
    Height = height;

    DCreatePixels(width, height);
    DCreateTranlateMatrix(width, height);

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
    uint32_t index = GetIndex(x, y);
    Helper::Log("index=%d, x=%d , y=%d", index, x, y);
    Pixels[index] = color;

    if (show)
        FastLED.show();
}