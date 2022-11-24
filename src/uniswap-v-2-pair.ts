import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import { concat } from "@graphprotocol/graph-ts/helper-functions";
import { Swap } from "../generated/UniswapV2Pair/UniswapV2Pair";
import { Candle } from "../generated/schema";

function exponentToBigDecimal(decimals: number): BigDecimal {
  return BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
}

export function handleSwap(event: Swap): void {
  const token0Decimals = 6;
  const token1Decimals = 18;

  let token0Amount: BigDecimal = event.params.amount0In
    .minus(event.params.amount0Out)
    .abs()
    .divDecimal(exponentToBigDecimal(token0Decimals));
  let token1Amount: BigDecimal = event.params.amount1Out
    .minus(event.params.amount1In)
    .abs()
    .divDecimal(exponentToBigDecimal(token0Decimals));

  let price = token0Amount.div(token1Amount);
  let timestamp = event.block.timestamp.toI32();

  let periods: i32[] = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60, 24 * 60 * 60];
  for (let i = 0; i < periods.length; i++) {
    let time_id = timestamp / periods[i];
    let candle_id = concat(
      concat(Bytes.fromI32(time_id), Bytes.fromI32(periods[i])),
      event.address
    ).toHex();
    let candle = Candle.load(candle_id);
    if (candle === null) {
      candle = new Candle(candle_id);
      candle.t = timestamp;
      candle.period = periods[i];
      candle.pair = event.address;
      candle.o = price;
      candle.l = price;
      candle.h = price;
      candle.v0 = BigDecimal.fromString("0");
      candle.v1 = BigDecimal.fromString("0");
    } else {
      if (price < candle.l) {
        candle.l = price;
      }
      if (price > candle.h) {
        candle.h = price;
      }
    }

    candle.c = price;
    candle.v0 = candle.v0.plus(token0Amount);
    candle.v1 = candle.v1.plus(token1Amount);

    candle.save();
  }
}
