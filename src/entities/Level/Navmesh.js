import * as THREE from 'three';
import Component from '../../Component'

import {Pathfinding} from 'three-pathfinding'


export default class Navmesh extends Component{
    constructor(scene, mesh){
        super();
        this.scene = scene;
        this.name = "Navmesh";
        this.zone = "level1";
        this.mesh = mesh;
    }

    Initialize(){
        this.pathfinding = new Pathfinding();

        this.mesh.traverse( ( node ) => {
            if(node.isMesh){ 
                this.pathfinding.setZoneData(this.zone, Pathfinding.createZone(node.geometry));
            }
        });
    }

    GetRandomNode(p, range){
        let groupID = this.pathfinding.getGroup(this.zone, p);
        if (groupID === null || groupID === undefined) {
            return null;
        }
        try {
            return this.pathfinding.getRandomNode(this.zone, groupID, p, range);
        } catch (e) {
            return null;
        }
    }

    FindPath(a, b){
        let groupID = this.pathfinding.getGroup(this.zone, a);
        if (groupID === null || groupID === undefined) {
            groupID = this.pathfinding.getGroup(this.zone, b);
        }
        if (groupID === null || groupID === undefined) {
            return [];
        }
        try {
            const path = this.pathfinding.findPath(a, b, this.zone, groupID);
            return path || [];
        } catch (e) {
            console.warn("Pathfinding error caught: ", e);
            return [];
        }
    }
}