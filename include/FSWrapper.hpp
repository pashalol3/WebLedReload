#ifndef FSWRAPPER
#define FSWRAPPER
#include <LittleFS.h>
#include "Helper.hpp"
class FSWrapper
{

public:
    uint8_t Width;
    uint8_t Height;
    uint32_t RefPointsSize;
    Point *RefPoints;
    FSWrapper() : RefPoints(nullptr),
                  Width(0),
                  Height(0),
                  RefPointsSize(0)
    {
    }

    void ReadConfigUnsafe(const char *fileName = "/config.txt")
    {
        File file = LittleFS.exists(fileName) == false ? 
                    LittleFS.open(fileName,FILE_READ,true) : 
                    LittleFS.open(fileName, FILE_READ);
        
        Helper::Assert(file, "Could't read %s", fileName);

        String widthStr = file.readStringUntil('\n');
        Width = widthStr.toInt();

        String heightStr = file.readStringUntil('\n');
        Height = heightStr.toInt();

        String pointsCountStr = file.readStringUntil('\n');
        size_t pointsCount = pointsCountStr.toInt();

        RefPointsSize = pointsCount;
        RefPoints = new Point[pointsCount];

        for (size_t i = 0; i < pointsCount; ++i)
        {
            String pointStr = file.readStringUntil('\n');
            int commaIndex = pointStr.indexOf(',');
            if (commaIndex != -1)
            {
                RefPoints[i].X = pointStr.substring(0, commaIndex).toInt();
                RefPoints[i].Y = pointStr.substring(commaIndex + 1).toInt();
            }
        }

        file.close();
    }

    static void WriteConfigUnsafe(int width, int height, Point *refPoints, size_t refPointsSize, const char *fileName = "/config.txt")
    {
        File file = LittleFS.open(fileName, "w");
        Helper::Assert(file, "Could't open %s for writing", fileName);

        file.println(width);
        file.println(height);

        file.println(refPointsSize);

        for (size_t i = 0; i < refPointsSize; ++i)
        {
            file.print(refPoints[i].X);
            file.print(",");
            file.println(refPoints[i].Y);
        }
        file.close();
    }
private:
};
#endif // FSWRAPPER