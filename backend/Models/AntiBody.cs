using System.Numerics;          
using System.Net.WebSockets;  
using GameConfig;

public class AntiBody
{
    public Vector2 Position { get; set; }
    public Vector2 Velocity { get; set; }
    public float Radius { get; set; }
    public string Color { get; set; } = Config.AntiColor;
    public bool IsSpeedBoost { get; set; } = false;
    public int? Bush_ID {get; set; } = null;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}