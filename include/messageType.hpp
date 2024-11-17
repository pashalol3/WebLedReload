#ifndef MESSAGE_TYPE
#define MESSAGE_TYPE

enum MessageType : uint8_t
{
    SetFullState = 1,
    SetPointsSolidColor = 2,
    SetSolidColor = 3,
    SetOnePixel = 4, 
    Settings = 5

};

#endif //MESSAGE_TYPE