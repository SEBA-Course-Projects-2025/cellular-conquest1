using System.Numerics;          
using System.Net.WebSockets;  

public class AntiBody
{
    public Vector2 Position { get; set; }
    public Vector2 Velocity { get; set; }
    public float Radius { get; set; }
    public string Color { get; set; } = "#3dda83";
    public bool IsSpeedBoost { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}