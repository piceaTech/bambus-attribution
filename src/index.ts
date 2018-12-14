import {Model} from 'sequelize-typescript';
import { Context } from 'koa';

import Bambus, {Controller, JSONAPIController} from '@bambus/main'


const debug = require('debug')('bambus:plugin:attribution');

const createdBySymbol = Symbol('createdBy');
const updatedBySymbol = Symbol('updatedBy');


interface AttributionModel<T extends Model<T>> extends Model<T>{
  [createdBySymbol]?: string;
  [updatedBySymbol]?: string;
}


export function CreatedBy<T extends Model<T>> (target: AttributionModel<T>, propertyKey: string): any { // this is the decorator
  // only set up because we don't know who is gonna make the change
  target[createdBySymbol] = propertyKey
}

export function UpdatedBy<T extends Model<T>> (target: AttributionModel<T>, propertyKey: string): any { // this is the decorator
  // set up which property should be updated when updating
  target[updatedBySymbol] = propertyKey   
}

export default function(bambus: Bambus){
  for(let controller in bambus.controllers){
    let currentController = bambus.controllers[controller];

    if(!(currentController instanceof JSONAPIController)){
       debug(`${controller}Controller is not a JSONAPIController therefore no attribution is used on it.`)
       continue;
    }
    debug(`${controller}Controller is a JSONAPIController therefore attribution is used on it.`)
    currentController.executeAfterFormatter(setUpMiddleware);
  }
}
function setUpMiddleware(this: JSONAPIController<any>){ // bound to the controller
  if(this.modelClass.prototype[createdBySymbol]){
    //create post
    this.router.post('set CreatedBy', '/', setCreatedBy(this.modelClass.prototype[createdBySymbol]));
  }

  if(this.modelClass.prototype[updatedBySymbol]){
    this.router.post('set UpdatedBy', '/', setUpdatedBy(this.modelClass.prototype[updatedBySymbol]));
    this.router.patch('set updatedBy', '/:id', setUpdatedBy(this.modelClass.prototype[updatedBySymbol]));
  }
}


function setUpdatedBy(property : string){
  return function(ctx: Context, next: Function){
    if(!ctx.state.user){
      throw new Error('User is not authenticated.')
    }
    if(typeof ctx.request.body === 'object'){
      (<any>ctx.request.body)[property] = ctx.state.user.id
    }
    return next();
  }
}

function setCreatedBy(property: string){
  return function(ctx: Context, next: Function){
    if(!ctx.state.user){
      throw new Error('User is not authenticated.')
    }
    if(typeof ctx.request.body === 'object'){
      (<any>ctx.request.body)[property] = ctx.state.user.id;
    }
    return next();
  }
}
