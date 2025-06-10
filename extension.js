const { St, Clutter, Gio } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Gvc = imports.misc.gvc;
const Util = imports.misc.util;

let brightnessExtension;

class BrightnessController extends PanelMenu.Button {
  constructor() {
    super(0.0, 'Brightness Controller');

    this.icon = new St.Icon({
      icon_name: 'display-brightness-symbolic',
      style_class: 'system-status-icon brightness-icon',
    });

    this.add_child(this.icon);

    this.slider = new Slider.Slider(1.0); // 1.0 = 100%
    this.slider.connect('value-changed', (_, value) => {
      let percentage = Math.round(value * 100);
      this.setBrightness(percentage);
    });

    let item = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    item.actor.add_child(this.slider);
    this.menu.addMenuItem(item);

    // Initialize with current brightness
    this._brightnessPath = '/sys/class/backlight';
    this._backlightInterface = this.getBacklightInterface();

    if (this._backlightInterface) {
      this.refreshSlider();
    }
  }

  getBacklightInterface() {
    const file = Gio.File.new_for_path(this._brightnessPath);
    let children = file.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);

    let info;
    while ((info = children.next_file(null)) !== null) {
      let name = info.get_name();
      if (name && name !== 'virtual') {
        return this._brightnessPath + '/' + name;
      }
    }

    return null;
  }

  setBrightness(percent) {
    if (!this._backlightInterface) return;

    try {
      let maxPath = `${this._backlightInterface}/max_brightness`;
      let curPath = `${this._backlightInterface}/brightness`;

      let maxBrightness = parseInt(Gio.File.new_for_path(maxPath).load_contents(null)[1].toString());
      let newBrightness = Math.round((percent / 100.0) * maxBrightness);

      Util.trySpawnCommandLine(`pkexec bash -c 'echo ${newBrightness} > ${curPath}'`);
    } catch (e) {
      log('Brightness control error: ' + e);
    }
  }

  refreshSlider() {
    try {
      let maxPath = `${this._backlightInterface}/max_brightness`;
      let curPath = `${this._backlightInterface}/brightness`;

      let maxBrightness = parseInt(Gio.File.new_for_path(maxPath).load_contents(null)[1].toString());
      let currentBrightness = parseInt(Gio.File.new_for_path(curPath).load_contents(null)[1].toString());

      this.slider.set_value(currentBrightness / maxBrightness);
    } catch (e) {
      log('Brightness slider error: ' + e);
    }
  }

  destroy() {
    super.destroy();
  }
}

function init() {}

function enable() {
  brightnessExtension = new BrightnessController();
  Main.panel.addToStatusArea('brightness-controller', brightnessExtension);
}

function disable() {
  if (brightnessExtension) {
    brightnessExtension.destroy();
    brightnessExtension = null;
  }
}
