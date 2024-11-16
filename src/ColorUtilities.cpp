#include "ColorUtilities.hpp"


float ColorUtilities::Mapfloat(float x, float in_min, float in_max, float out_min, float out_max)
{
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

uint32_t ColorUtilities::Wheel8(uint8_t color)
{
  uint8_t r, g, b;
  uint8_t shift;
  uint32_t resultColor{0};
  if (color > 170)
  {
    shift = (color - 170) * 3;
    r = shift;
    g = 0;
    b = 255 - shift;
  }
  else if (color > 85)
  {
    shift = (color - 85) * 3;
    r = 0;
    g = 255 - shift;
    b = shift;
  }
  else
  {
    shift = color * 3;
    r = 255 - shift;
    g = shift;
    b = 0;
  }

  resultColor |= 0 << 24; //alpha 
  resultColor |= r << 16;
  resultColor |= g << 8;
  resultColor |= b << 0;
  
  return resultColor;
}
