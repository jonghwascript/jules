class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Dynamically create a texture for the ball
        const graphics = this.make.graphics({ fillStyle: { color: 0xffffff } });
        graphics.fillCircle(10, 10, 10);
        graphics.generateTexture('ball', 20, 20);
        graphics.destroy();
    }

    create() {
        this.cameras.main.setBackgroundColor('#2E8B57');
        this.hole = this.add.circle(700, 300, 15, 0x000000);
        this.physics.add.existing(this.hole, true);
        this.ball = this.physics.add.sprite(100, 300, 'ball');
        this.ball.setCircle(10);
        this.ball.setCollideWorldBounds(true);
        this.ball.setBounce(0.5);
        this.ball.setDamping(true);
        this.ball.setDrag(0.95);

        this.strokes = 0;
        this.strokeText = this.add.text(16, 16, '타수: 0', { fontSize: '24px', fill: '#fff' });

        // Swing mechanics
        this.swingState = 'ready'; // ready, powering, accuracy, hit, finished
        this.power = 0;
        this.powerDirection = 1;
        this.accuracy = 0;
        this.accuracyDirection = 1;
        this.swingUI = this.add.graphics();
        this.winText = null;
        this.restartText = null;

        this.input.on('pointerdown', this.handleSwing, this);
        this.physics.add.overlap(this.ball, this.hole, this.ballInHole, null, this);
    }

    update() {
        if (this.swingState === 'finished') {
            this.swingUI.clear();
            return;
        }

        if (this.swingState === 'powering') {
            this.power += 2 * this.powerDirection;
            if (this.power >= 100) {
                this.power = 100;
                this.powerDirection = -1;
            } else if (this.power <= 0) {
                this.power = 0;
                this.powerDirection = 1;
            }
        } else if (this.swingState === 'accuracy') {
            this.accuracy += 2 * this.accuracyDirection;
            if (this.accuracy >= 100) {
                this.accuracy = 100;
                this.accuracyDirection = -1;
            } else if (this.accuracy <= 0) {
                this.accuracy = 0;
                this.accuracyDirection = 1;
            }
        }

        this.drawSwingUI();

        if (this.ball.body.velocity.length() < 1 && this.swingState === 'hit') {
            this.swingState = 'ready';
        }
    }

    ballInHole(ball, hole) {
        // Add a guard clause to prevent this from running multiple times
        if (this.swingState === 'finished') {
            return;
        }

        ball.setVelocity(0, 0);
        ball.x = hole.x;
        ball.y = hole.y;
        this.swingState = 'finished';

        this.winText = this.add.text(400, 280, '축하합니다!', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.restartText = this.add.text(400, 350, '클릭하여 다시 시작', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    }

    restartGame() {
        this.ball.setPosition(100, 300);
        this.strokes = 0;
        this.strokeText.setText('타수: 0');
        this.swingState = 'ready';

        if (this.winText) this.winText.destroy();
        if (this.restartText) this.restartText.destroy();
    }

    handleSwing() {
        switch (this.swingState) {
            case 'ready':
                if (this.ball.body.velocity.length() > 1) return;
                this.swingState = 'powering';
                this.power = 0;
                this.powerDirection = 1;
                break;
            case 'powering':
                this.swingState = 'accuracy';
                this.accuracy = 0;
                this.accuracyDirection = 1;
                break;
            case 'accuracy':
                this.hitBall();
                break;
            case 'finished':
                this.restartGame();
                break;
        }
    }

    drawSwingUI() {
        this.swingUI.clear();
        if (this.swingState === 'ready' || this.swingState === 'hit' || this.swingState === 'finished') return;

        this.swingUI.fillStyle(0xffffff, 0.5);
        this.swingUI.fillRect(this.ball.x - 50, this.ball.y + 30, 100, 10);

        this.swingUI.fillStyle(0xff0000, 1);
        this.swingUI.fillRect(this.ball.x - 50, this.ball.y + 30, this.power, 10);

        if (this.swingState === 'accuracy') {
            this.swingUI.fillStyle(0x0000ff, 1);
            this.swingUI.fillRect(this.ball.x - 50 + this.accuracy - 1, this.ball.y + 25, 2, 20);
        }
    }

    hitBall() {
        this.swingUI.clear();
        this.strokes++;
        this.strokeText.setText('타수: ' + this.strokes);

        const angleDeviation = (this.accuracy - 50) / 50 * 0.26;
        const velocity = this.power * 3.5;

        const velocityX = Math.cos(angleDeviation) * velocity;
        const velocityY = Math.sin(angleDeviation) * velocity;

        this.ball.setVelocity(velocityX, velocityY);

        this.swingState = 'hit';
        this.power = 0;
        this.accuracy = 0;
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-example',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [GameScene]
};

window.onload = function() {
    const game = new Phaser.Game(config);
};
