const TYPE_COLORS = {
  entrance: '#61d7ca',
  combat: '#7b8390',
  archive: '#79a7e6',
  treasure: '#d5b35f',
  shrine: '#9d82d8',
  elite: '#d56e55',
  vault: '#f0d495',
};

export class Minimap {
  constructor(canvas, mapState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mapState = mapState;
    this.currentRoomId = mapState.entranceRoomId;
    this.cleared = new Set([mapState.entranceRoomId]);
    this.interlaced = false;
    this.resize();
    this.draw();
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  }

  resize() {
    const size = Math.max(150, Math.min(230, window.innerWidth * 0.18));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(size * ratio);
    this.canvas.height = Math.round(size * ratio);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.size = size;
  }

  setState({ currentRoomId, clearedRoomIds, interlaced }) {
    if (currentRoomId !== undefined) this.currentRoomId = currentRoomId;
    if (clearedRoomIds) this.cleared = new Set(clearedRoomIds);
    if (interlaced !== undefined) this.interlaced = interlaced;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const size = this.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(4, 7, 12, 0.78)';
    ctx.fillRect(0, 0, size, size);

    const xs = this.mapState.rooms.map((room) => room.x);
    const zs = this.mapState.rooms.map((room) => room.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const span = Math.max(maxX - minX, maxZ - minZ, 1);
    const scale = (size - 34) / span;
    const toPoint = (room) => ({
      x: 17 + (room.x - minX) * scale + (span - (maxX - minX)) * scale * 0.5,
      y: 17 + (room.z - minZ) * scale + (span - (maxZ - minZ)) * scale * 0.5,
    });

    ctx.lineWidth = 1;
    for (const connection of this.mapState.connections) {
      const a = toPoint(this.mapState.rooms[connection.a]);
      const b = toPoint(this.mapState.rooms[connection.b]);
      ctx.strokeStyle = connection.critical ? 'rgba(213, 182, 105, .62)' : 'rgba(130, 146, 166, .25)';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (this.interlaced) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      for (const room of this.mapState.interlace.rooms) {
        const source = this.mapState.rooms[room.sourceRoomId];
        if (!source) continue;
        const point = toPoint(source);
        ctx.strokeStyle = '#cc78d3';
        ctx.strokeRect(point.x - 4, point.y - 4, 8, 8);
      }
      ctx.restore();
    }

    for (const room of this.mapState.rooms) {
      const point = toPoint(room);
      const active = room.id === this.currentRoomId;
      const cleared = this.cleared.has(room.id);
      ctx.beginPath();
      ctx.arc(point.x, point.y, active ? 5.5 : room.type === 'vault' ? 4.7 : 3.3, 0, Math.PI * 2);
      ctx.fillStyle = cleared ? TYPE_COLORS[room.type] ?? '#aab1ba' : 'rgba(65, 72, 83, .92)';
      ctx.fill();
      if (active) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#fff4d0';
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(213, 182, 105, .24)';
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
}
