// Phaser game configuration
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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Create a new Phaser game instance
const game = new Phaser.Game(config);

function preload() {
    // Dynamically create a texture for the ball
    const graphics = this.make.graphics({ fillStyle: { color: 0xffffff } });
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('ball', 20, 20);
    graphics.destroy();
}

function create() {
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
    this.strokeText = this.add.text(16, 16, 'Strokes: 0', { fontSize: '24px', fill: '#fff' });

    // Swing mechanics
    this.swingState = 'ready'; // ready, powering, accuracy
    this.power = 0;
    this.powerDirection = 1; // 1 for up, -1 for down
    this.accuracy = 0;
    this.accuracyDirection = 1;
    this.swingUI = this.add.graphics();

    this.input.on('pointerdown', this.handleSwing, this);

    // Add overlap check between ball and hole
    this.physics.add.overlap(this.ball, this.hole, this.ballInHole, null, this);
}

function ballInHole(ball, hole) {
    ball.setVelocity(0, 0);
    ball.x = hole.x;
    ball.y = hole.y;
    this.swingState = 'finished';

    this.add.text(400, 280, 'Congratulations!', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(400, 350, 'Click to Restart', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
}

function restartGame() {
    this.ball.setPosition(100, 300);
    this.strokes = 0;
    this.strokeText.setText('Strokes: 0');
    this.swingState = 'ready';
    // A bit of a hack to remove the text. A more robust solution would store the text objects.
    this.children.list.forEach(child => {
        if (child.type === 'Text' && (child.text.includes('Congratulations') || child.text.includes('Restart'))) {
            child.destroy();
        }
    });
}

function update() {
    // Don't update swing UI if game is finished
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

function handleSwing() {
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

function drawSwingUI() {
    this.swingUI.clear();
    if (this.swingState === 'ready' || this.swingState === 'hit') return;

    // Draw power bar background
    this.swingUI.fillStyle(0xffffff, 0.5);
    this.swingUI.fillRect(this.ball.x - 50, this.ball.y + 30, 100, 10);

    // Draw power level
    this.swingUI.fillStyle(0xff0000, 1);
    this.swingUI.fillRect(this.ball.x - 50, this.ball.y + 30, this.power, 10);

    if (this.swingState === 'accuracy') {
        // Draw accuracy marker
        this.swingUI.fillStyle(0x0000ff, 1);
        this.swingUI.fillRect(this.ball.x - 50 + this.accuracy - 1, this.ball.y + 25, 2, 20);
    }
}

function hitBall() {
    this.swingUI.clear();
    this.strokes++;
    this.strokeText.setText('Strokes: ' + this.strokes);

    // Accuracy affects the angle. 50 is perfect.
    // Max deviation is 15 degrees (0.26 rad)
    const angleDeviation = (this.accuracy - 50) / 50 * 0.26;
    const velocity = this.power * 3.5;

    const velocityX = Math.cos(angleDeviation) * velocity;
    const velocityY = Math.sin(angleDeviation) * velocity;

    this.ball.setVelocity(velocityX, velocityY);

    this.swingState = 'hit';
    this.power = 0;
    this.accuracy = 0;
}
