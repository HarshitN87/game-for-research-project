import Component from '../../Component'

export default class UIManager extends Component{
    constructor(){
        super();
        this.name = 'UIManager';
    }

    SetAmmo(mag, rest){
        document.getElementById("current_ammo").innerText = mag;
        document.getElementById("max_ammo").innerText = rest;
    }

    SetHealth(health){
        document.getElementById("health_progress").style.width = `${health}%`;
    }

    FlashDamage() {
        const flash = document.getElementById("damage_flash");
        if (flash) {
            flash.style.transition = "none";
            flash.style.opacity = "0.45";
            flash.getBoundingClientRect(); // force reflow
            flash.style.transition = "opacity 0.3s ease-out";
            flash.style.opacity = "0";
        }
    }

    Initialize(){
        document.getElementById("game_hud").style.visibility = 'visible';

        if (!document.getElementById("damage_flash")) {
            const flash = document.createElement("div");
            flash.id = "damage_flash";
            flash.style.position = "fixed";
            flash.style.inset = "0";
            flash.style.backgroundColor = "rgba(255, 0, 0, 1)";
            flash.style.opacity = "0";
            flash.style.pointerEvents = "none";
            flash.style.zIndex = "100";
            flash.style.transition = "opacity 0.3s ease-out";
            document.body.appendChild(flash);
        }
    }
}