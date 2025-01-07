#ifndef HELPER
#define HELPER
#include <Arduino.h>
#include <stdint.h>
class Helper
{
#define Log(message, ...) _log(__func__, message, __VA_ARGS__)
public:
    static void FallWithError(const char *message, ...)
    {
        const uint8_t ledPin = 2;
        pinMode(ledPin, OUTPUT);
        va_list args;
        va_start(args, message);
        char formattedMessage[256];
        vsnprintf(formattedMessage, sizeof(formattedMessage), message, args);
        Serial.println(formattedMessage);
        va_end(args);
        while (1)
        {
            delay(500);
            digitalWrite(ledPin, !digitalRead(ledPin));
        }
    }

    static void Assert(bool predicate, const char *message, ...)
    {
        if (!predicate)
        {
            va_list args;
            va_start(args, message);
            Helper::FallWithError(message, args);
            va_end(args);
        }
    }
    static void _log(const char *methodName, const char *message, ...)
    {
        va_list args;
        va_start(args, message);
        char formattedMessage[256];
        vsnprintf(formattedMessage, sizeof(formattedMessage), message, args);
        Serial.println(formattedMessage);
        va_end(args);
    }

private:
};

#endif // HELPER