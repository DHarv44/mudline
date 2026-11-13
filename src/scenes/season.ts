import { PAINTS } from '../content/drivers';
import { catalogById, classById, classesOf, freshUpgrades, modeById, seriesOf, statsFor, vehicleById, vehiclesIn } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { Session } from '../game/session';
import { drawSide, partLook } from '../render/garageArt';
import { drawVehicle } from '../render/sprites';
import { backdrop, cover, dirs, inBox, panel, statBar, UI } from '../ui/kit';

const STEPS = ['PICK A CHAMPIONSHIP', 'PICK A CLASS', 'PICK YOUR RIDE'];

/** Starting a season: choose the championship, the class to enter it in, and the vehicle. Then on to the garage. */
export function seasonScene(g: Game, modeId: string): Scene {
  const mode = modeById(modeId);
  const all = seriesOf(mode.id);
  const pick = [0, 0, 0];
  let step = 0;
  let spin = 0;

  const series = () => all[pick[0]];
  const klass = () => classesOf(series())[pick[1]];
  const rides = () => vehiclesIn(series(), klass());
  const count = () => [all.length, classesOf(series()).length, rides().length][step];
  const cardW = () => Math.min(200, (448 - (count() - 1) * 8) / count());
  const cardX = (i: number) => (480 - (count() * cardW() + (count() - 1) * 8)) / 2 + i * (cardW() + 8);

  const confirm = () => {
    g.sfx.play('ok');
    if (step < 2) {
      step++;
      pick[step] = 0;
      return;
    }
    Session.clearSave();
    g.session.setup([0, null, null, null], 'champ', series().id, { vehicles: [rides()[pick[2]]], klass: klass(), paints: [0] });
    g.session.save();
    g.go('garage');
  };

  return {
    update(dt) {
      spin += dt;
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        if (step === 0) g.go('title');
        else step--;
        return;
      }
      const { dx } = dirs(g);
      const before = pick[step];
      pick[step] = (pick[step] + dx + count()) % count();
      const m = g.screen.mouse;
      if (m.moved || m.click) {
        for (let i = 0; i < count(); i++) {
          if (!inBox(g, cardX(i), 44, cardW(), 200)) continue;
          pick[step] = i;
          if (m.click) {
            confirm();
            return;
          }
        }
      }
      if (pick[step] !== before) g.sfx.play('move');
      if (g.input.anyHit('ok') >= 0) confirm();
    },
    draw() {
      const s = g.screen;
      const trail = [series().name, step > 0 ? classById(klass()).name : ''].filter(Boolean).slice(0, step).join(' / ');
      backdrop(s, STEPS[step], trail);
      const w = cardW();
      const small = w < 130;
      for (let i = 0; i < count(); i++) {
        const x = cardX(i);
        const on = pick[step] === i;
        panel(s, x, 44, w, 200, on);
        s.ctx.imageSmoothingEnabled = true;
        if (step === 0) {
          const ser = all[i];
          cover(s, g.tracks.thumb(ser.tracks[0], mode.style), x + 4, 48, w - 8, 70);
          cover(s, g.tracks.thumb(ser.tracks[ser.tracks.length - 1], mode.style), x + 4, 122, w - 8, 44);
          s.ctx.imageSmoothingEnabled = false;
          s.text(ser.name, x + w / 2, 176, on ? UI.gold : UI.text, { align: 'center', size: small ? 6 : 8 });
          s.text(`${ser.tracks.length} ROUNDS`, x + w / 2, 194, UI.dim, { align: 'center', shadow: false });
          s.text(`${classesOf(ser).length} CLASSES`, x + w / 2, 208, UI.faint, { align: 'center', shadow: false });
          s.text(`$${ser.prizes[0]} TO WIN`, x + w / 2, 226, UI.good, { align: 'center', size: 6, shadow: false });
        } else if (step === 1) {
          const id = classesOf(series())[i];
          const list = vehiclesIn(series(), id);
          list.forEach((v, k) => {
            const gap = Math.min(50, 120 / list.length);
            drawVehicle(s.ctx, v, (i + k * 2) % PAINTS.length, mode.style, x + w / 2, 78 + k * gap, on ? spin * 1.5 + k : -Math.PI / 2, 0, list.length > 2 ? 1.8 : 2.2);
          });
          s.ctx.imageSmoothingEnabled = false;
          s.text(classById(id).name, x + w / 2, 196, on ? UI.gold : UI.text, { align: 'center', size: small ? 6 : 8 });
          s.text(`${list.length} TO CHOOSE`, x + w / 2, 214, UI.dim, { align: 'center', size: 6, shadow: false });
        } else {
          const v = vehicleById(rides()[i]);
          const cat = catalogById(series().catalog);
          const up = freshUpgrades(cat);
          s.rect(x + 4, 48, w - 8, 84, '#1c2230');
          s.rect(x + 4, 120, w - 8, 12, '#3a3d44');
          drawSide(s, v, PAINTS[0].rgb, partLook(cat, up), 0, x + w / 2, 122, Math.min(130, w - 30));
          s.ctx.imageSmoothingEnabled = false;
          s.text(v.name, x + w / 2, 142, on ? UI.gold : UI.text, { align: 'center', size: v.name.length * 8 > w - 10 ? 6 : 8 });
          const st = statsFor(v, cat, up);
          const bw = w - 20;
          statBar(s, 'SPEED', x + 10, 162, bw, st.top / 130);
          statBar(s, 'POWER', x + 10, 176, bw, st.accel / 120);
          statBar(s, 'GRIP', x + 10, 190, bw, st.grip / 6);
          statBar(s, 'HANDLING', x + 10, 204, bw, st.turn / 4.6);
          statBar(s, 'WEIGHT', x + 10, 218, bw, st.mass / 1.7);
        }
        s.ctx.imageSmoothingEnabled = false;
      }
    },
  };
}
