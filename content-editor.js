#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class ContentEditor {
    constructor() {
        this.guidesPath = path.join(__dirname, 'public', 'guides');
        this.contentPath = path.join(__dirname, 'content');
    }

    async start() {
        console.log('🎬 유튜브 이미지 생성기 - 콘텐츠 편집기');
        console.log('=====================================\n');
        
        await this.showMenu();
    }

    async showMenu() {
        console.log('📋 메뉴:');
        console.log('1. API 가이드 편집');
        console.log('2. 사용법 가이드 편집');
        console.log('3. 이미지 추가');
        console.log('4. 배포');
        console.log('5. 종료\n');

        const choice = await this.question('선택하세요 (1-5): ');
        
        switch(choice) {
            case '1':
                await this.editApiGuide();
                break;
            case '2':
                await this.editUserGuide();
                break;
            case '3':
                await this.addImage();
                break;
            case '4':
                await this.deploy();
                break;
            case '5':
                console.log('편집기를 종료합니다.');
                rl.close();
                return;
            default:
                console.log('잘못된 선택입니다.');
        }
        
        await this.showMenu();
    }

    async editApiGuide() {
        console.log('\n📋 API 가이드 편집');
        console.log('==================\n');
        
        const steps = [
            '1. Google AI Studio 접속',
            '2. API 키 생성 페이지 이동',
            '3. API 키 생성',
            '4. 키 복사 및 저장'
        ];

        console.log('편집할 단계를 선택하세요:');
        steps.forEach((step, index) => {
            console.log(`${index + 1}. ${step}`);
        });

        const stepChoice = await this.question('\n단계 번호 입력: ');
        const stepIndex = parseInt(stepChoice) - 1;
        
        if (stepIndex >= 0 && stepIndex < steps.length) {
            await this.editStep(stepIndex + 1, steps[stepIndex]);
        } else {
            console.log('잘못된 단계입니다.');
        }
    }

    async editStep(stepNumber, stepTitle) {
        console.log(`\n✏️ "${stepTitle}" 편집 중...\n`);
        
        const currentContent = await this.loadStepContent(stepNumber);
        if (currentContent) {
            console.log('현재 내용:');
            console.log('----------');
            console.log(currentContent);
            console.log('----------\n');
        }

        console.log('편집 옵션:');
        console.log('1. 내용 추가');
        console.log('2. 이미지 추가');
        console.log('3. 주의사항 추가');
        console.log('4. 팁 추가');
        
        const editChoice = await this.question('선택하세요: ');
        
        switch(editChoice) {
            case '1':
                await this.addContent(stepNumber);
                break;
            case '2':
                await this.addImageToStep(stepNumber);
                break;
            case '3':
                await this.addWarning(stepNumber);
                break;
            case '4':
                await this.addTip(stepNumber);
                break;
        }
    }

    async addImageToStep(stepNumber) {
        console.log('\n🖼️ 이미지 추가');
        
        const imageName = await this.question('이미지 파일명 입력 (예: google-ai-studio.png): ');
        const altText = await this.question('이미지 설명 입력: ');
        const caption = await this.question('캡션 입력 (선택사항): ');
        
        const imageHtml = `
<div class="my-6">
    <img src="../images/${imageName}" alt="${altText}" class="max-w-full h-auto rounded shadow-md border">
    ${caption ? `<p class="text-sm text-gray-600 mt-2 text-center">${caption}</p>` : ''}
</div>`;

        console.log('\n생성된 HTML:');
        console.log('-------------');
        console.log(imageHtml);
        console.log('-------------');
        
        const confirm = await this.question('이 내용을 추가하시겠습니까? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            await this.updateStepContent(stepNumber, imageHtml);
            console.log('✅ 이미지가 추가되었습니다!');
        }
    }

    async addTip(stepNumber) {
        const tipContent = await this.question('팁 내용을 입력하세요: ');
        
        const tipHtml = `
<div class="bg-blue-50 border border-blue-200 p-4 rounded-lg my-4">
    <div class="flex items-center">
        <span class="text-blue-600 text-xl mr-2">💡</span>
        <p class="text-blue-800"><strong>팁:</strong> ${tipContent}</p>
    </div>
</div>`;

        const confirm = await this.question('이 팁을 추가하시겠습니까? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            await this.updateStepContent(stepNumber, tipHtml);
            console.log('✅ 팁이 추가되었습니다!');
        }
    }

    async deploy() {
        console.log('\n🚀 배포 시작...');
        
        try {
            // Git 작업
            console.log('📦 변경사항을 스테이징합니다...');
            await this.runCommand('git add -A');
            
            const commitMessage = await this.question('커밋 메시지 입력: ');
            await this.runCommand(`git commit -m "${commitMessage}"`);
            
            console.log('🌐 원격 저장소에 푸시합니다...');
            await this.runCommand('git push');
            
            console.log('✅ 배포가 완료되었습니다!');
            
        } catch (error) {
            console.error('❌ 배포 중 오류 발생:', error.message);
        }
    }

    // 헬퍼 메서드들
    question(query) {
        return new Promise(resolve => rl.question(query, resolve));
    }

    async runCommand(command) {
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });
    }

    async loadStepContent(stepNumber) {
        // 실제 구현에서는 해당 단계의 HTML 내용을 로드
        return '';
    }

    async updateStepContent(stepNumber, newContent) {
        // 실제 구현에서는 HTML 파일 업데이트
        console.log(`Step ${stepNumber} 업데이트됨`);
    }
}

// 스크립트 실행
if (require.main === module) {
    const editor = new ContentEditor();
    editor.start().catch(console.error);
}

module.exports = ContentEditor;