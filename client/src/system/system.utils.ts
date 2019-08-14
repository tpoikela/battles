
import RG from '../rg';
import * as Component from '../component';
type Level = import('../level').Level;

/* Can be used to emit zone event with specified data, which will be processed
 * by System.ZoneEvent.
 */
export function emitZoneEvent(level: Level, evt: string, data?: any): void {
    const parentZone = level.getParentZone();
    if (parentZone) {
        const zoneEvent = new Component.ZoneEvent();
        zoneEvent.setEventType(evt);
        if (data) {
            zoneEvent.setEventData(data);
        }
        parentZone.add(zoneEvent);
    }
    if (RG.debugZoneEvents) {
    }
}
