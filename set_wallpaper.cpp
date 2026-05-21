#include <windows.h>
#include <iostream>
#include <string> 

HWND workerw = nullptr;

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    HWND p = FindWindowEx(hwnd, NULL, "SHELLDLL_DefView", NULL);
    if (p != NULL) {
        workerw = FindWindowEx(NULL, hwnd, "WorkerW", NULL);
    }
    return TRUE;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Usage: set_wallpaper.exe \"Window Title\" [restore]" << std::endl;
        return 1;
    }

    HWND myWindow = FindWindow(NULL, argv[1]);
    if (myWindow == NULL) {
        std::cout << "Cannot find your window: " << argv[1] << std::endl;
        return 1;
    }

    if (argc >= 3 && std::string(argv[2]) == "restore") {
        SetParent(myWindow, NULL); 
        std::cout << "Success! Restored to normal window." << std::endl;
        return 0;
    }

    HWND progman = FindWindow("Progman", NULL);
    SendMessageTimeout(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, nullptr);
    EnumWindows(EnumWindowsProc, 0);

    if (workerw != nullptr) {
        SetParent(myWindow, workerw);
        std::cout << "Success! Embedded into the desktop." << std::endl;
    }
    else {
        std::cout << "Failed to find the secret desktop layer." << std::endl;
    }

    return 0;
}