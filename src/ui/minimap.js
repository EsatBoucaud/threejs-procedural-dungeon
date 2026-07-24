const TYPE_COLORS = {
  entrance: '#61d7ca',
  breach: '#d37ad5',
  combat: '#7b8390',
  archive: '#79a7e6',
  treasure: '#d5b35f',
  shrine: '#9d82d8',
  elite: '#d56e55',
  vault: '#f0d495',
};

function indexRooms(rooms) {
  return new Map(rooms.map((room) => [room.id, room]));
}

export class Minimap {
  constructor(canvas, mapState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mapState = mapState;
    this.baseById = indexRooms(mapState.rooms);
    this.remoteById = indexRooms(mapState.interlace?.rooms ?? []);
    this.currentRoomId = mapState.entranceRoomId;
    this.cleared = new Set([mapState.entranceRoomId]);
    this.overlapsVisited = new Set();
    this.interlaced = false;
    this.tutorialTargetRoomId = mapState.tutorialTargetRoomId ?? null;
    this.resize();
    this.draw();
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
    window.addEventListener('abrir:tutorial-target', (event) => {
      this.tutorialTargetRoomId = event.detail?.completed ? null : event.detail?.roomId ?? null;
      this.mapState.tutorialTargetRoomId = this.tutorialTargetRoomId;
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

  setState({ currentRoomId, clearedRoomIds, interlaced, overlapsVisited }) {
    if (currentRoomId !== undefined) this.currentRoomId = currentRoomId;
    if (clearedRoomIds) this.cleared = new Set(clearedRoomIds);
    if (interlaced !== undefined) this.interlaced = interlaced;
    if (overlapsVisited) this.overlapsVisited = new Set(overlapsVisited);
    this.draw();
  }

  drawConnection(connection, roomIndex, toPoint, style, width = 1) {
    const a = roomIndex.get(connection.a);
    const b = roomIndex.get(connection.b);
    if (!a || !b) return;
    const start = toPoint(a);
    const end = toPoint(b);
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  drawTutorialMarker(toPoint) {
    if (this.tutorialTargetRoomId === null || this.tutorialTargetRoomId === undefined) return;
    const room = this.baseById.get(this.tutorialTargetRoomId);
    if (!room) return;
    const point = toPoint(room);
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 8.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(244, 213, 125, .98)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.fillStyle = '#f4d57d';
    this.ctx.font = 'bold 8px ui-monospace, monospace';
    this.ctx.fillText('T', point.x - 2.5, point.y + 2.8);
  }

  drawForecastMarkers(toPoint) {
    if (!this.interlaced) return;
    const forecast = this.mapState.safeWindowForecast;
    if (!forecast) return;
    const opportunityRoom = this.remoteById.get(forecast.opportunity?.roomId);
    if (opportunityRoom) {
      const point = toPoint(opportunityRoom);
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(244, 213, 125, .98)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.fillStyle = '#f4d57d';
      this.ctx.font = 'bold 8px ui-monospace, monospace';
      this.ctx.fillText('O', point.x - 2.5, point.y + 2.8);
    }

    const danger = forecast.danger?.position;
    if (danger && Number.isFinite(danger.x) && Number.isFinite(danger.z)) {
      const point = toPoint(danger);
      this.ctx.strokeStyle = 'rgba(232, 102, 82, .98)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(point.x - 5, point.y - 5);
      this.ctx.lineTo(point.x + 5, point.y + 5);
      this.ctx.moveTo(point.x + 5, point.y - 5);
      this.ctx.lineTo(point.x - 5, point.y + 5);
      this.ctx.stroke();
    }
  }

  draw() {
    const ctx = this.ctx;
    const size = this.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(4, 7, 12, 0.78)';
    ctx.fillRect(0, 0, size, size);

    const allRooms = [...this.mapState.rooms, ...(this.mapState.interlace?.rooms ?? [])];
    const xs = allRooms.map((room) => room.x);
    const zs = allRooms.map((room) => room.z);
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

    for (const connection of this.mapState.connections) {
      this.drawConnection(
        connection,
        this.baseById,
        toPoint,
        connection.critical ? 'rgba(213, 182, 105, .62)' : 'rgba(130, 146, 166, .25)',
        connection.critical ? 1.25 : 1,
      );
    }

    if (this.interlaced) {
      for (const connection of this.mapState.interlace?.connections ?? []) {
        this.drawConnection(
          connection,
          this.remoteById,
          toPoint,
          connection.critical ? 'rgba(218, 121, 220, .72)' : 'rgba(190, 112, 201, .34)',
          connection.critical ? 1.25 : 1,
        );
      }
      ctx.setLineDash([3, 3]);
      for (const bridge of this.mapState.interlace?.bridges ?? []) {
        const a = this.baseById.get(bridge.a);
        const b = this.remoteById.get(bridge.b);
        if (!a || !b) continue;
        const start = toPoint(a);
        const end = toPoint(b);
        ctx.strokeStyle = 'rgba(102, 220, 210, .78)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const overlap of this.mapState.interlace?.overlaps ?? []) {
        const point = toPoint(overlap);
        const visited = this.overlapsVisited.has(overlap.id);
        ctx.strokeStyle = visited ? 'rgba(244, 223, 151, .9)' : 'rgba(207, 118, 214, .4)';
        ctx.lineWidth = visited ? 1.4 : 1;
        ctx.strokeRect(
          point.x - Math.max(2.5, overlap.width * scale * 0.15),
          point.y - Math.max(2.5, overlap.depth * scale * 0.15),
          Math.max(5, overlap.width * scale * 0.3),
          Math.max(5, overlap.depth * scale * 0.3),
        );
      }
    }

    const drawRoom = (room, remote) => {
      const point = toPoint(room);
      const active = room.id === this.currentRoomId;
      const cleared = this.cleared.has(room.id);
      ctx.beginPath();
      ctx.arc(point.x, point.y, active ? 5.5 : room.type === 'vault' ? 4.7 : 3.3, 0, Math.PI * 2);
      if (remote) {
        ctx.fillStyle = cleared ? TYPE_COLORS[room.type] ?? '#d37ad5' : 'rgba(92, 53, 104, .85)';
      } else {
        ctx.fillStyle = cleared ? TYPE_COLORS[room.type] ?? '#aab1ba' : 'rgba(65, 72, 83, .92)';
      }
      ctx.fill();
      if (remote) {
        ctx.strokeStyle = 'rgba(222, 142, 224, .65)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (active) {
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = '#fff4d0';
        ctx.stroke();
      }
    };

    for (const room of this.mapState.rooms) drawRoom(room, false);
    if (this.interlaced) {
      for (const room of this.mapState.interlace?.rooms ?? []) drawRoom(room, true);
      this.drawForecastMarkers(toPoint);
    }
    this.drawTutorialMarker(toPoint);

    ctx.fillStyle = 'rgba(213, 182, 105, .72)';
    ctx.font = '8px ui-monospace, monospace';
    const legend = this.interlaced
      ? 'LOCAL + REMOTE // O OPPORTUNITY / × DANGER'
      : this.tutorialTargetRoomId !== null && this.tutorialTargetRoomId !== undefined
        ? 'LOCAL STATE // T ORIENTATION TARGET'
        : 'LOCAL STATE';
    ctx.fillText(legend, 8, size - 8);
    ctx.strokeStyle = 'rgba(213, 182, 105, .24)';
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
}
