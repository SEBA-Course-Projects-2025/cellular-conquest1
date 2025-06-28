using System.Numerics;
using GameConfig;


public class Food
{
    public Vector2 Position { get; set; }
    public float Radius { get; set; } = Config.FoodRadius;
    public string Color { get; set; } = Config.FoodColor;
    
    public bool IsSpeedBoost { get; set; } = false;
    public int? Bush_ID {get; set; } = null;

}