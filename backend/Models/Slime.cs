using System.Numerics;
using GameConfig;


public class Slime
{
    public Vector2 Position { get; set; }   // Center
    public float Radius { get; set; }
    public string Color { get; set; } = Config.SlimeColor;
    public Guid ID {get; set; }

}