import math

# Let's test the coordinates of a 1920x1080 viewport for a sheet with rotate = +7 deg
w = 1920
h = 1080
angle_deg = 7.0
rad = math.radians(angle_deg)

# If transform origin is "top left" (0,0) and card is at x_offset = 12% * w, y_offset = 50% * h
x_offset = 0.12 * w
y_offset = 0.50 * h

# Top left corner: (x_offset, y_offset)
# Top right corner: (x_offset + w * cos(rad), y_offset + w * sin(rad))
top_left = (x_offset, y_offset)
top_right = (x_offset + w * math.cos(rad), y_offset + w * math.sin(rad))

print(f"Top-left: x={top_left[0]/w*100:.1f}%, y={top_left[1]/h*100:.1f}%")
print(f"Top-right: x={top_right[0]/w*100:.1f}%, y={top_right[1]/h*100:.1f}%")
print(f"Slope: drop of {(top_right[1] - top_left[1])} px over {w} px ({((top_right[1] - top_left[1])/h)*100:.1f}% of screen height)")
