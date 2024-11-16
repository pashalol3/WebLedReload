#ifndef COLOR_UTILITIES
#define COLOR_UTILITIES
#include <stdint.h>
class ColorUtilities
{
public:
    static float Mapfloat(float x, float in_min, float in_max, float out_min, float out_max);
    static uint32_t Wheel8(uint8_t color);

private:
};

#endif // COLOR_UTILITIES