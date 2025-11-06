export class ScoreManager {
  private score: number = 0;
  private multiplier: number = 1;
  private combo: number = 0;
  private coins: number = 0;

  public addScore(points: number): void {
    const finalPoints = points * this.multiplier;
    this.score += finalPoints;
    this.combo++;

    // Increase multiplier with combo
    this.multiplier = Math.min(1 + Math.floor(this.combo / 5), 10);

    // Add coins (70% of score)
    this.coins += Math.floor(points * 0.7);
  }

  public resetCombo(): void {
    this.combo = 0;
    this.multiplier = 1;
  }

  public spendCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      return true;
    }
    return false;
  }

  public getScore(): number {
    return this.score;
  }

  public getMultiplier(): number {
    return this.multiplier;
  }

  public getCombo(): number {
    return this.combo;
  }

  public getCoins(): number {
    return this.coins;
  }

  public reset(): void {
    this.score = 0;
    this.multiplier = 1;
    this.combo = 0;
    this.coins = 0;
  }
}
