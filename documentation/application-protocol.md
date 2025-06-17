<table>
<tr>
  <th>Message Type</th>
  <th>Direction</th>
  <th>When Sent</th>
  <th>Payload Format</th>
  <th>Description & Details</th>
</tr>

<tr>
  <td><code>join</code></td>
  <td>Client → Server</td>
  <td>Once, when connecting</td>
  <td>
    <pre><code>{
  "type": "join",
  "nickname": "PlayerName",
  "mode"?: "FFA" | "Death Match" | "Teams" | "Other",
  "privateServer"?: true | Guid,
  "customSkin"?: string // <b>🧪 Beta</b>
}</code></pre>
  </td>
  <td>
    Registers a new player and joins game.
    <br/>
    <b>🧪 Beta:</b> The <code>customSkin</code> field, if present, defines the player's image. It is:
    <ul>
      <li>Either a base64-encoded image (custom uploaded),</li>
      <li>Or a predefined skin ID from <code>availableSkins</code>.</li>
    </ul>
    Server should broadcast it to others via <code>customSkinBroadcast</code>.
  </td>
</tr>

<tr>
  <td><code>playerData</code></td>
  <td>Server → Client</td>
  <td>After successful join</td>
  <td>
    <pre><code>{
  "type": "playerData",
  "id": Guid,
  "nickname": "PlayerName",
  "width": 1920,
  "height": 1080,
  "roomId": Guid,
  "currentImages": [
    {
      "id": Guid
      "image": string (base64 OR skin ID)
    } // <b>🧪 Beta</b>
  ]
}
</code></pre>
  </td>
  <td>Confirms successful join, sends back basic info of the game.
  
  <b>🧪 Beta:</b> Send initial image info for all players with specified Guids in the room to the newly joined player.
  </td>
</tr>

<tr>
  <td><code>input</code></td>
  <td>Client → Server</td>
  <td>On mouse movement</td>
  <td>
    <pre><code>{
  "type": "input",
  "direction": {
    "x": number,
    "y": number
  }
}</code></pre>
  </td>
  <td>Sets move vector</td>
</tr>

<tr>
  <td><code>split</code></td>
  <td>Client → Server</td>
  <td>On Space key press</td>
  <td><pre><code>{ "type": "split" }</code></pre></td>
  <td>Triggers cell split.</td>
</tr>

<tr>
  <td><code>feed</code></td>
  <td>Client → Server</td>
  <td>On W key press</td>
  <td><pre><code>{ "type": "feed" }</code></pre></td>
  <td>
    <b>🧪 Beta:</b> Shoots 10% mass as food. In mode against bots acts as projectiles damaging them.
  </td>
</tr>

<tr>
  <td><code>speedup</code></td>
  <td>Client → Server</td>
  <td>On Shift press</td>
  <td>
    <pre><code>{
  "type": "speedup"
}</code></pre>
  </td>
  <td>Enables speed boost.</td>
</tr>

<tr>
  <td><code>leave</code></td>
  <td>Client → Server</td>
  <td>On player exit</td>
  <td><pre><code>{ "type": "leave" }</code></pre></td>
  <td>Disconnects player.</td>
</tr>

<tr>
  <td><code>gameState</code></td>
  <td>Server → Client</td>
  <td>Every frame (~60 fps)</td>
  <td>
    <pre><code>{
  "type": "gameState",
  "visiblePlayers": [
    {
      "id": Guid,
      "nickname": string,
      "score": number,
      "cells": [
        {
          "x": number,
          "y": number,
          "radius": number,
          "color": "rgb(...)"
        }
      ],
      "abilities"?: {
        "speed": number (0 - 5)
      }
    }
  ],
  "visibleFood": [
    {
      "x": number,
      "y": number,
      "radius": number,
      "color": number,
      "type"?: "normal" | "speed" | "shield" | "unknown",
      "visibility"?: number (0 - 100) // <b>🧪 Beta</b>
    }
  ],
  "timestamp": number
}</code></pre>
  </td>
  <td>Full world snapshot.</td>
</tr>

<tr>
  <td><code>death</code></td>
  <td>Server → Client</td>
  <td>On player death</td>
  <td><pre><code>{
  "type": "death",
  "score": number
}</code></pre></td>
  <td>Final score summary.</td>
</tr>

<tr>
  <td><code>leaderboard</code></td>
  <td>Server → Client</td>
  <td>Every 1s</td>
  <td>
    <pre><code>{
  "type": "leaderboard",
  "topPlayers": [
    { "nickname": string, "score": number }
  ],
  "personal": {
    "rank": number,
    "score": number
  }
}</code></pre>
  </td>
  <td>Ranking data.</td>
</tr>

<tr>
  <td><code>availableSkins</code></td>
  <td>Server → Client</td>
  <td>On connection or request</td>
  <td>
    <pre><code>{
  "type": "availableSkins",
  "skins": [
    {
      "id": string,
      "image": string (base64)
    }
  ]
}</code></pre>
  </td>
  <td>
    <b>🧪 Beta:</b> Sends list of available skins as ID + base64 image.
  </td>
</tr>

<tr>
  <td><code>customSkinBroadcast</code></td>
  <td>Server → All clients in room</td>
  <td>When a player joins with a skin</td>
  <td>
    <pre><code>{
  "type": "customSkinBroadcast",
  "id": Guid,
  "image": string (base64 OR skin ID)
}</code></pre>
  </td>
  <td>
    <b>🧪 Beta:</b> Informs room about a new image for player with specified Guid — either uploaded image (base64) or ID from skins.
  </td>
</tr>

<tr>
  <td><code>playerDisconnected</code></td>
  <td>Server → All clients in room</td>
  <td>On player leave</td>
  <td>
    <pre><code>{
  "type": "playerDisconnected",
  "id": Guid
}</code></pre>
  </td>
  <td>
    <b>🧪 Beta:</b> Tells clients to remove the disconnected player's image.
  </td>
</tr>

</table>
