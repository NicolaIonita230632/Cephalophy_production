"""Model architecture definitions"""

import torch
import torch.nn as nn
from torchvision import models


class DilatedResNetEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        resnet = models.resnet50(weights=None)

        self.conv1 = resnet.conv1
        self.bn1 = resnet.bn1
        self.relu = resnet.relu
        self.maxpool = resnet.maxpool

        self.layer1 = resnet.layer1
        self.layer2 = resnet.layer2
        self.layer3 = self._make_dilated_layer(resnet.layer3, dilation=2)
        self.layer4 = self._make_dilated_layer(resnet.layer4, dilation=4)

    def _make_dilated_layer(self, layer, dilation):
        for module in layer.modules():
            if isinstance(module, nn.Conv2d):
                if module.kernel_size[0] == 3:
                    module.dilation = (dilation, dilation)
                    module.padding = (dilation, dilation)
        return layer

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        f1 = self.layer1(x)
        f2 = self.layer2(f1)
        f3 = self.layer3(f2)
        f4 = self.layer4(f3)

        return f1, f2, f3, f4


class HeatmapDecoder(nn.Module):
    def __init__(self, num_landmarks=19):
        super().__init__()

        self.up4 = nn.Sequential(
            nn.ConvTranspose2d(2048, 1024, kernel_size=2, stride=2),
            nn.BatchNorm2d(1024),
            nn.ReLU(inplace=True),
        )

        self.conv4 = nn.Sequential(
            nn.Conv2d(1024 + 1024, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
        )

        self.up3 = nn.Sequential(
            nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
        )

        self.conv3 = nn.Sequential(
            nn.Conv2d(256 + 512, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
        )

        self.up2 = nn.Sequential(
            nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
        )

        self.conv2 = nn.Sequential(
            nn.Conv2d(128 + 256, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
        )

        self.final = nn.Conv2d(128, num_landmarks, kernel_size=1)

    def forward(self, f1, f2, f3, f4):
        x = self.up4(f4)
        x = torch.cat([x, f3], dim=1)
        x = self.conv4(x)

        x = self.up3(x)
        x = torch.cat([x, f2], dim=1)
        x = self.conv3(x)

        x = self.up2(x)
        x = torch.cat([x, f1], dim=1)
        x = self.conv2(x)

        heatmaps = self.final(x)
        return heatmaps


class DeepFuseCephalogramNet(nn.Module):
    def __init__(self, num_landmarks=19):
        super().__init__()
        self.encoder = DilatedResNetEncoder()
        self.decoder = HeatmapDecoder(num_landmarks)

    def forward(self, x):
        f1, f2, f3, f4 = self.encoder(x)
        heatmaps = self.decoder(f1, f2, f3, f4)
        return heatmaps
