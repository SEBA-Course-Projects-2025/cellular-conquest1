using System.Numerics;
using GameConfig;


public class Food
{
    public Vector2 Position { get; set; }
    public float Radius { get; set; }
    public string Color { get; set; } = Config.FoodColor;
    
    public bool IsSpeedBoost { get; set; } = false;
    public Guid? Bush_ID {get; set; } = null;

}