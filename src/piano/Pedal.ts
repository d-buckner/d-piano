import { ToneBufferSource } from 'tone';

import { PianoComponent } from './Component';
import { randomBetween } from './Util';
import AudioBufferCache from './AudioBufferCache';

import type { ToneAudioBuffers } from 'tone';
import type { PianoComponentOptions } from './Component';


export class Pedal extends PianoComponent {

  private _downTime: number = Infinity;

  private _currentSound: ToneBufferSource = null;

  private _buffers: ToneAudioBuffers;

  constructor(options: PianoComponentOptions) {
    super(options);

    this._downTime = Infinity;
  }

  protected async _internalLoad(): Promise<void> {
    this._buffers = await AudioBufferCache.getBuffers(this.samples, {
      down1: 'pedalD1.ogg',
      down2: 'pedalD2.ogg',
      up1: 'pedalU1.ogg',
      up2: 'pedalU2.ogg', 
    });
  }

  /**
	 *  Squash the current playing sound
	 */
  private _squash(time: number): void {
    if (this._currentSound && this._currentSound.state !== 'stopped') {
      this._currentSound.stop(time);
    }
    this._currentSound = null;
  }

  private _playSample(time: number, dir: 'down' | 'up'): void {
    if (this._enabled) {
      this._currentSound = new ToneBufferSource({
        context: this.context,
        curve: 'exponential',
        fadeIn: 0.05,
        fadeOut: 0.1,
        url: this._buffers.get(`${dir}${Math.random() > 0.5 ? 1 : 2}`),
      }).connect(this.output);
      this._currentSound.start(time, randomBetween(0, 0.01), undefined, 0.1 * randomBetween(0.5, 1));
    }
  }

  /**
	 * Put the pedal down
	 */
  down(time: number): void {
    this._squash(time);
    this._downTime = time;
    this._playSample(time, 'down');
  }

  /**
	 * Put the pedal up
	 */
  up(time: number): void {
    this._squash(time);
    this._downTime = Infinity;
    this._playSample(time, 'up');
  }

  /**
	 * Indicates if the pedal is down at the given time
	 */
  isDown(time: number): boolean {
    return time >= this._downTime;
  }
}
