using System.Numerics;

public class Food
{
    public Vector2 Position { get; set; }
    public float Radius { get; set; } = 5f;
    public string Color { get; set; } = "#3dda83";
    
    public bool IsSpeedBoost { get; set; } = false;
    public int? Bush_ID {get; set; } = null;

}