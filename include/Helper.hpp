#ifndef HELPER
#define HELPER
#include <Arduino.h>
#include <stdint.h>

class Helper
{

#define Log(message, ...) _log(__FILE__, message, ##__VA_ARGS__)
#define Assert(predicate, message, ...) _assert(predicate,__FILE__, __LINE__, message, ##__VA_ARGS__)
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

    static void _assert(bool predicate, const char *fileName,  int line, const char *message, ...)
    {
        if (!predicate)
        {
            va_list args;
            va_start(args, message);

            char assertionMessage[256];

            snprintf(assertionMessage, sizeof(assertionMessage), "[AssertionFailed] %s:%d: ", fileName, line);

            vsnprintf(assertionMessage + strlen(assertionMessage), sizeof(assertionMessage) - strlen(assertionMessage), message, args);

            Helper::FallWithError(assertionMessage);

            va_end(args);
        }
    }
    static void _log(const char *fileName, const char *message, ...)
    {
        va_list args;
        va_start(args, message);
        char formattedMessage[256];
        snprintf(formattedMessage, sizeof(formattedMessage), "[%s] ", fileName);
        vsnprintf(formattedMessage + strlen(formattedMessage), sizeof(formattedMessage) - strlen(formattedMessage), message, args);
        Serial.println(formattedMessage);
        va_end(args);
    }

private:
};

#endif // HELPER