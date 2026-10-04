import cv2
import numpy as np

# Load all 6 images
img1 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/1.png')
img2 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/2.png')
img3 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/3.png')
img4 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/4.png')
img5 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/5.png')
img6 = cv2.imread('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/6.png')

# Ensure standard 940 or 941 width is normalized to 940
def norm(im):
    return cv2.resize(im, (940, 1672), interpolation=cv2.INTER_LANCZOS4)

i1, i2, i3, i4, i5, i6 = map(norm, [img1, img2, img3, img4, img5, img6])

# Let's save:
# 1) Text layers: y 0..560
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_1.png', i1[0:560, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_2.png', i2[0:560, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_3.png', i3[0:560, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_4.png', i4[0:560, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_5.png', i5[0:560, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/text_6.png', i6[0:560, :])

# 2) Scene layers: y 560..1672
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_1.png', i1[560:, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_2.png', i2[560:, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_3.png', i3[560:, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_4.png', i4[560:, :])
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_5.png', i5[560:, :])

# For frame 6:
# In Frame 6, we have the watch scene at 560..1672. But the badge is at bottom y=1250..1520.
# We want to extract the badge separately so we can position it higher and larger!
# Let's inspect badge bounding box in i6:
# The badge is around y=1250..1520, x=150..800
badge_crop = i6[1260:1500, 160:780]
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/badge_crop.png', badge_crop)

# Clean scene 6 without the badge: we can use scene_5 as the base background for 6 since scene_5 has clean table/counter and no badge!
cv2.imwrite('campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/scene_6_clean.png', i5[560:, :])

print("All split layers successfully prepared.")
