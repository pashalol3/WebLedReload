#ifndef FSWRAPPER
#define FSWRAPPER
#include <LittleFS.h>
#include "Helper.hpp"
class FSWrapper
{
private:
    /* data */
public:
    static void ReadConfigUnsafe(int *width, int *height)
    {
        const char *fileName = "/config.txt";
        File file = LittleFS.open(fileName, "r");
        if (!file)
            Helper::FallWithError("Could't read %s", fileName);

        String widthStr = file.readStringUntil('\n');
        *width = widthStr.toInt();

        String heightStr = file.readStringUntil('\n');
        *height = heightStr.toInt();

        file.close();
    }

    static void WriteConfigUnsafe(int width, int height)
    {
        const char *fileName = "/config.txt";
        File file = LittleFS.open(fileName, "w");
        if (!file)
            Helper::FallWithError("Could't open %s for writing", fileName);

        file.println(width);
        file.println(height);

        file.close();
    }
};

#endif // FSWRAPPER