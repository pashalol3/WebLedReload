#include <stdint.h>


struct Point
{
    public:
    uint16_t X;
    uint16_t Y;
    Point(){}
    Point(uint16_t x, uint16_t y) : X(x), Y(y) {}
};
