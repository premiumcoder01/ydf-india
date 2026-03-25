import re

file_path = "/Users/macbook/Desktop/YDF/app/(dashboard)/student/student-profile-personal.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. State
state_target = """    application_type: "",
    competitive_exam: "",
    competitive_exam_name: "","""
state_replace = """    application_type: "",
    competitive_exam: "",
    competitive_exam_name: "",
    village: "",
    whatsapp_number: "","""
content = content.replace(state_target, state_replace)

# 2. Fetch
fetch_target = """              competitive_exam_name: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'competitive_exam_name')?.value || prev.competitive_exam_name,

              profileImageUrl: user?.profileimageurl || "","""
fetch_replace = """              competitive_exam_name: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'competitive_exam_name')?.value || prev.competitive_exam_name,
              village: user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'village')?.value || prev.village,
              whatsapp_number: (() => {
                const val = user.customfields?.find((f: any) => f.shortname.toLowerCase() === 'whatsapp_number')?.value || "";
                return val.replace(/<[^>]*>/g, '').trim();
              })() || prev.whatsapp_number,

              profileImageUrl: user?.profileimageurl || "","""
content = content.replace(fetch_target, fetch_replace)

# 3. New inputs
ui_replace = r"""\1
              <CustomTextInput
                label="WhatsApp Number"
                value={personalInfo.whatsapp_number}
                onChangeText={(val) => handlePersonalInfoChange("whatsapp_number", val)}
                style={styles.input}
                placeholder="e.g. 9876543210"
                keyboardType="number-pad"
                maxLength={10}
                icon="logo-whatsapp"
              />
              <CustomTextInput
                label="Village / City"
                value={personalInfo.village}
                onChangeText={(val) => handlePersonalInfoChange("village", val)}
                style={styles.input}
                placeholder="Enter Village Name"
                icon="location-outline"
              />
              <PickerRow
                label="Application Type\""""
                
content = re.sub(
    r'(<View style={\[styles\.formCard,\s*{\s*backgroundColor:\s*colors\.card,\s*borderColor:\s*colors\.border,\s*borderLeftColor:\s*"#059669",\s*borderLeftWidth:\s*4\s*}\]}\s*>)\s*\n\s*<PickerRow\n\s*label="Application Type"',
    ui_replace,
    content
)

# 4. Preparing for competitive exam icon
content = content.replace('icon="help-circle-outline"', 'icon="pencil-outline"')
content = content.replace('icon="bookmark-outline"', 'icon="trophy-outline"')

# 5. Fix icons
def set_color_margin(match):
    block = match.group(0)
    
    if any(l in block for l in ['"Username"', '"First Name"', '"Last Name"', '"Email Address *"']):
        color = '"#7C3AED"'
    elif any(l in block for l in ['"WhatsApp Number"', '"Village / City"', '"Local District"', '"Alternate Mobile"', '"12th Percentage"', '"Father\'s Name"', '"Mother\'s Name"', '"Address"', '"City"']):
        color = '"#059669"'
    else:
        color = '"#D97706"'
        
    # Remove existing iconColor or mainStyle just in case
    block = re.sub(r'iconColor=["\'][^"\']+["\']', '', block)
    block = re.sub(r'mainStyle=\{.*?\}', '', block)
    
    # Append new properties before the ending />
    addition = f' iconColor={color} mainStyle={{{{ marginBottom: 0 }}}}\n '
    block = re.sub(r'\/>\s*$', addition + r'/>', block)
    
    return block

# The regex matches exactly `<CustomTextInput ... />` excluding other components.
content = re.sub(r'<CustomTextInput[\s\S]*?\/>', set_color_margin, content)

with open(file_path, "w") as f:
    f.write(content)

print("Restoration complete")
