import os

file_path = r'c:\Users\pc\Documents\MY-PROJECTS\safevault\app\dashboard\create\page.tsx'
tmp_path = r'c:\Users\pc\Documents\MY-PROJECTS\safevault\app\dashboard\create_effect_tmp.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(tmp_path, 'r', encoding='utf-8') as f:
    new_block = f.read()

# Lines 103 to 186 (1-indexed)
# 0-indexed: [102:186]
start_idx = 102
end_idx = 186

# Be careful: lines[start_idx:end_idx] should be the block to remove
# We want to replace everything from 103 to 186
final_content = "".join(lines[:start_idx]) + new_block + "".join(lines[end_idx:])

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Successfully updated create/page.tsx")
