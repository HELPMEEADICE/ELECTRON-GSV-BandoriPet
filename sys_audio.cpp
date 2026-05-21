#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <iostream>
#include <vector>
#include <complex>
#include <cmath>

#pragma comment(lib, "Ole32.lib")

using Complex = std::complex<double>;
const double PI = 3.14159265358979323846;
const int FFT_SIZE = 512; 

void fft(std::vector<Complex>& a) {
    int n = a.size();
    if (n <= 1) return;
    std::vector<Complex> a0(n / 2), a1(n / 2);
    for (int i = 0; i < n / 2; i++) {
        a0[i] = a[2 * i];
        a1[i] = a[2 * i + 1];
    }
    fft(a0);
    fft(a1);
    for (int i = 0; i < n / 2; i++) {
        Complex t = std::polar(1.0, -2.0 * PI * i / n) * a1[i];
        a[i] = a0[i] + t;
        a[i + n / 2] = a0[i] - t;
    }
}

int main() {
    CoInitialize(nullptr);

    IMMDeviceEnumerator* pEnumerator = nullptr;
    CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), (void**)&pEnumerator);

    IMMDevice* pDevice = nullptr;
    pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);

    IAudioClient* pAudioClient = nullptr;
    pDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, NULL, (void**)&pAudioClient);

    WAVEFORMATEX* pwfx = nullptr;
    pAudioClient->GetMixFormat(&pwfx);

    pAudioClient->Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 0, 0, pwfx, NULL);

    IAudioCaptureClient* pCaptureClient = nullptr;
    pAudioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&pCaptureClient);

    pAudioClient->Start();

    UINT32 packetLength = 0;
    std::vector<Complex> samples;
    samples.reserve(FFT_SIZE);

    while (true) {
        pCaptureClient->GetNextPacketSize(&packetLength);
        while (packetLength != 0) {
            BYTE* pData;
            UINT32 numFramesAvailable;
            DWORD flags;
            pCaptureClient->GetBuffer(&pData, &numFramesAvailable, &flags, NULL, NULL);

            int bytesPerFrame = pwfx->nBlockAlign;
            int numChannels = pwfx->nChannels;

            for (UINT32 i = 0; i < numFramesAvailable; i++) {
                float sample = 0;
                if (pData && !(flags & AUDCLNT_BUFFERFLAGS_SILENT)) {
                    float* floatData = (float*)(pData + i * bytesPerFrame);
                    for (int c = 0; c < numChannels; ++c) {
                        sample += floatData[c];
                    }
                    sample /= numChannels;
                }
                samples.push_back(Complex(sample, 0));

                if (samples.size() >= FFT_SIZE) {
                    fft(samples);

                    int bins = 64; 
                    int step = (FFT_SIZE / 2) / bins;

                    for (int b = 0; b < bins; b++) {
                        double mag = 0;
                        for (int j = 0; j < step; j++) {
                            mag += std::abs(samples[b * step + j]);
                        }
                        mag /= step;

                        int outMag = (int)(mag * 2500.0);
                        if (outMag > 255) outMag = 255;

                        std::cout << outMag << (b == bins - 1 ? "" : ",");
                    }
                    std::cout << std::endl;
                    samples.clear();
                }
            }
            pCaptureClient->ReleaseBuffer(numFramesAvailable);
            pCaptureClient->GetNextPacketSize(&packetLength);
        }
        Sleep(15);
    }
    return 0;
}