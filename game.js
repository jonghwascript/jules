class Enemy extends Phaser.GameObjects.Image {
    constructor(scene) {
        super(scene, 0, 0, 'enemy');
        this.path = null;
        this.pathT = 0;
        this.speed = 0.0005; // Speed in terms of t (0 to 1) per millisecond
    }

    startOnPath(path) {
        this.path = path;
        this.pathT = 0;

        // Get the start point of the path
        const startPoint = this.path.getPoint(this.pathT);
        this.setPosition(startPoint.x, startPoint.y);
    }

    update(time, delta) {
        if (!this.path) return;

        this.pathT += this.speed * delta;
        const vec = this.path.getPoint(this.pathT);

        if (vec) {
            this.setPosition(vec.x, vec.y);
        } else {
            // Reached end of path
            this.scene.enemyReachedEnd(this);
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

class Bullet extends Phaser.Physics.Arcade.Image {
    constructor(scene) {
        super(scene, 0, 0, 'bullet');
        this.speed = 400;
        this.lifespan = 1000; // ms
        this.timer = null;
    }

    fire(x, y, angle) {
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);
        this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);

        this.timer = this.scene.time.delayedCall(this.lifespan, () => {
            this.setActive(false);
            this.setVisible(false);
        });
    }
}

class Tower extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
        super(scene, x, y, 'tower');
        this.scene.add.existing(this);
        this.range = 150;
        this.fireRate = 500; // ms
        this.nextFire = 0;
    }

    update(time, delta) {
        if (time > this.nextFire) {
            const nearestEnemy = this.findNearestEnemy();
            if (nearestEnemy) {
                this.fireAt(nearestEnemy);
                this.nextFire = time + this.fireRate;
            }
        }
    }

    findNearestEnemy() {
        let nearestDistance = this.range;
        let nearestEnemy = null;

        this.scene.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        });
        return nearestEnemy;
    }

    fireAt(enemy) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
        const bullet = this.scene.bullets.get();
        if (bullet) {
            bullet.fire(this.x, this.y, angle);
        }
    }
}


class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Create textures
        let enemyGraphics = this.make.graphics({ fillStyle: { color: 0xff0000 } });
        enemyGraphics.fillRect(0, 0, 20, 20);
        enemyGraphics.generateTexture('enemy', 20, 20);
        enemyGraphics.destroy();

        let towerGraphics = this.make.graphics({ fillStyle: { color: 0x0000ff } });
        towerGraphics.fillRect(0, 0, 40, 40);
        towerGraphics.generateTexture('tower', 40, 40);
        towerGraphics.destroy();

        let bulletGraphics = this.make.graphics({ fillStyle: { color: 0xffffff } });
        bulletGraphics.fillCircle(5, 5, 5);
        bulletGraphics.generateTexture('bullet', 10, 10);
        bulletGraphics.destroy();
    }

    create() {
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0xffffff, 1);
        this.path = this.add.path(100, -50);
        this.path.lineTo(100, 200);
        this.path.lineTo(500, 200);
        this.path.lineTo(500, 400);
        this.path.lineTo(700, 400);
        this.path.lineTo(700, 650);
        this.path.draw(graphics);

        this.health = 10;
        this.money = 100;
        this.gameOverText = null;

        this.healthText = this.add.text(10, 10, 'Health: 10', { fontSize: '20px', fill: '#ffffff' });
        this.moneyText = this.add.text(10, 40, 'Money: 100', { fontSize: '20px', fill: '#ffffff' });

        this.enemies = this.add.group({ classType: Enemy, runChildUpdate: true });
        this.towers = this.add.group({ classType: Tower, runChildUpdate: true });
        this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });

        this.towerPlacementSpots = [
            { x: 200, y: 250, isOccupied: false },
            { x: 400, y: 250, isOccupied: false },
            { x: 600, y: 300, isOccupied: false },
            { x: 300, y: 350, isOccupied: false }
        ];

        this.towerPlacementSpots.forEach(spot => {
            const spotGraphic = this.add.rectangle(spot.x, spot.y, 40, 40, 0x00ff00, 0.3);
            spotGraphic.setData({ spot_data: spot, isPlacementSpot: true });
            spotGraphic.setInteractive();
        });

        this.waveConfig = [
            { enemyCount: 10, spawnDelay: 1500 },
            { enemyCount: 20, spawnDelay: 1000 },
            { enemyCount: 30, spawnDelay: 500 }
        ];
        this.currentWave = 0;
        this.enemiesToSpawn = 0;
        this.waveText = this.add.text(10, 70, 'Wave: 1', { fontSize: '20px', fill: '#ffffff' });

        this.physics.add.overlap(this.enemies, this.bullets, this.damageEnemy, null, this);

        this.input.on('gameobjectdown', this.handleObjectClick, this);

        this.startNextWave();
    }

    startNextWave() {
        if (this.currentWave >= this.waveConfig.length) {
            if (this.health > 0) {
                 this.add.text(400, 300, 'YOU WIN!', { fontSize: '64px', fill: '#00ff00' }).setOrigin(0.5);
                 this.physics.pause();
            }
            return;
        }

        const wave = this.waveConfig[this.currentWave];
        this.enemiesToSpawn = wave.enemyCount;
        this.waveText.setText('Wave: ' + (this.currentWave + 1));

        this.enemySpawner = this.time.addEvent({
            delay: wave.spawnDelay,
            callback: this.spawnEnemy,
            callbackScope: this,
            repeat: wave.enemyCount - 1
        });
    }

    handleObjectClick(pointer, gameObject) {
        if (gameObject.getData('isPlacementSpot')) {
            this.placeTower(gameObject);
        }
    }

    placeTower(spotGraphic) {
        const spot = spotGraphic.getData('spot_data');
        const towerCost = 50;

        if (!spot.isOccupied && this.money >= towerCost) {
            this.money -= towerCost;
            this.moneyText.setText('Money: ' + this.money);
            spot.isOccupied = true;

            const tower = this.towers.get();
            if (tower) {
                tower.setActive(true);
                tower.setVisible(true);
                tower.setPosition(spot.x, spot.y);
            }

            spotGraphic.disableInteractive();
            spotGraphic.fillColor = 0xff0000;
            spotGraphic.fillAlpha = 0.1;
        }
    }

    enemyReachedEnd(enemy) {
        if (this.health > 0) {
            this.health--;
            this.healthText.setText('Health: ' + this.health);
        }
    }

    damageEnemy(enemy, bullet) {
        if (enemy.active && bullet.active) {
            enemy.setActive(false);
            enemy.setVisible(false);

            bullet.setActive(false);
            bullet.setVisible(false);

            this.money += 10;
            this.moneyText.setText('Money: ' + this.money);
        }
    }

    spawnEnemy() {
        const enemy = this.enemies.get();
        if (enemy) {
            enemy.setActive(true);
            enemy.setVisible(true);
            enemy.startOnPath(this.path);
        }
    }

    update(time, delta) {
        if (this.health <= 0 && !this.gameOverText) {
            this.gameOverText = this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
            this.physics.pause();
            if (this.enemySpawner) this.enemySpawner.remove(false);
            this.towers.getChildren().forEach(tower => tower.setActive(false));
            return;
        }

        if (this.health > 0 && this.enemySpawner && this.enemySpawner.getRepeatCount() === 0 && this.enemies.countActive() === 0) {
            this.enemySpawner.remove(false);
            this.currentWave++;
            this.startNextWave();
        }
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
