#!/usr/bin/env python3
"""
스타일별 미리보기 이미지 생성 스크립트
각 이미지 스타일에 맞는 미리보기 이미지를 생성합니다.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import json

def create_gradient_background(width, height, color1, color2):
    """그라데이션 배경 생성"""
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)
    
    for y in range(height):
        # 선형 그라데이션 계산
        ratio = y / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    return image

def add_text_overlay(image, text, position, color, font_size=24):
    """텍스트 오버레이 추가"""
    draw = ImageDraw.Draw(image)
    
    try:
        # 시스템 폰트 사용 시도
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            # Windows 한글 폰트 시도
            font = ImageFont.truetype("malgun.ttf", font_size)
        except:
            # 기본 폰트 사용
            font = ImageFont.load_default()
    
    draw.text(position, text, fill=color, font=font)
    return image

def create_style_preview(style_name, style_info):
    """스타일별 미리보기 이미지 생성"""
    width, height = 300, 200
    
    # 스타일별 색상 및 디자인 설정
    style_configs = {
        '감성 멜로': {
            'bg_colors': [(255, 182, 193), (255, 228, 225)],  # 핑크 그라데이션
            'text_color': (139, 69, 19),
            'accent': '💕'
        },
        '서부극': {
            'bg_colors': [(160, 82, 45), (210, 180, 140)],  # 브라운 그라데이션
            'text_color': (101, 67, 33),
            'accent': '🤠'
        },
        '공포 스릴러': {
            'bg_colors': [(25, 25, 25), (64, 64, 64)],  # 다크 그라데이션
            'text_color': (220, 220, 220),
            'accent': '🎭'
        },
        '1980년대': {
            'bg_colors': [(255, 20, 147), (0, 191, 255)],  # 네온 그라데이션
            'text_color': (255, 255, 255),
            'accent': '💫'
        },
        '2000년대': {
            'bg_colors': [(127, 255, 212), (255, 182, 193)],  # Y2K 그라데이션
            'text_color': (75, 0, 130),
            'accent': '📱'
        },
        '사이버펑크': {
            'bg_colors': [(20, 20, 40), (80, 0, 80)],  # 사이버 그라데이션
            'text_color': (0, 255, 255),
            'accent': '🌃'
        },
        '판타지': {
            'bg_colors': [(72, 61, 139), (147, 112, 219)],  # 보라 그라데이션
            'text_color': (255, 215, 0),
            'accent': '🧙‍♂️'
        },
        '미니멀': {
            'bg_colors': [(245, 245, 245), (255, 255, 255)],  # 화이트 그라데이션
            'text_color': (64, 64, 64),
            'accent': '⚪'
        },
        '빈티지': {
            'bg_colors': [(139, 119, 101), (205, 192, 176)],  # 세피아 그라데이션
            'text_color': (101, 67, 33),
            'accent': '📷'
        },
        '모던': {
            'bg_colors': [(70, 130, 180), (176, 196, 222)],  # 블루 그라데이션
            'text_color': (25, 25, 112),
            'accent': '🏢'
        },
        '동물': {
            'bg_colors': [(255, 228, 181), (255, 218, 185)],  # 따뜻한 그라데이션
            'text_color': (139, 69, 19),
            'accent': '🐾'
        },
        '실사 극대화': {
            'bg_colors': [(105, 105, 105), (169, 169, 169)],  # 그레이 그라데이션
            'text_color': (255, 255, 255),
            'accent': '📸'
        },
        '애니메이션': {
            'bg_colors': [(255, 99, 132), (54, 162, 235)],  # 밝은 그라데이션
            'text_color': (255, 255, 255),
            'accent': '🎨'
        }
    }
    
    config = style_configs.get(style_name, {
        'bg_colors': [(128, 128, 128), (192, 192, 192)],
        'text_color': (0, 0, 0),
        'accent': '🎭'
    })
    
    # 배경 생성
    image = create_gradient_background(width, height, config['bg_colors'][0], config['bg_colors'][1])
    
    # 텍스트 추가
    draw = ImageDraw.Draw(image)
    
    # 중앙에 액센트 이모지 (크게)
    accent_pos = (width//2 - 30, height//2 - 40)
    try:
        font_large = ImageFont.truetype("seguiemj.ttf", 48)  # 이모지 폰트
    except:
        font_large = ImageFont.load_default()
    
    draw.text(accent_pos, config['accent'], fill=config['text_color'], font=font_large)
    
    # 스타일 이름
    name_pos = (width//2 - len(style_name) * 6, height//2 + 20)
    draw.text(name_pos, style_name, fill=config['text_color'], font=ImageFont.load_default())
    
    return image

def main():
    """메인 함수"""
    # 스타일 목록
    styles = [
        '감성 멜로', '서부극', '공포 스릴러', '1980년대', '2000년대',
        '사이버펑크', '판타지', '미니멀', '빈티지', '모던',
        '동물', '실사 극대화', '애니메이션'
    ]
    
    # 출력 폴더 확인
    output_dir = "public/style-previews"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print("스타일 미리보기 이미지 생성 시작...")
    
    for style in styles:
        print(f"생성 중: {style}")
        
        # 파일명에서 특수문자 제거
        filename = style.replace(' ', '_').replace('/', '_')
        filepath = os.path.join(output_dir, f"{filename}.png")
        
        # 이미지 생성
        preview_image = create_style_preview(style, {})
        
        # PNG 형식으로 저장
        preview_image.save(filepath, "PNG", quality=95)
        
        print(f"저장 완료: {filepath}")
    
    print(f"\n✅ 총 {len(styles)}개의 미리보기 이미지가 생성되었습니다!")
    print(f"📁 저장 위치: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()