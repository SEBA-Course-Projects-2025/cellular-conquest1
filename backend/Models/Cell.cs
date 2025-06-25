using System.Numerics;          
using System.Net.WebSockets;  

public class Cell
{
    public Vector2 Position { get; set; }
    public float Radius { get; set; }
    public Vector2 Velocity { get; set; } = Vector2.Zero;
    public int? Bush_ID {get; set; } = null;
}