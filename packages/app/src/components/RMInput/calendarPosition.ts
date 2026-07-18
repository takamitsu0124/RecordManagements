import type { SizeTypes } from './size'
/**
 * カレンダーの展開位置を取得する
 */
export const calendarPosition = (
  refInput: HTMLElement | undefined,
  inputSize: SizeTypes,
  labelFlag: boolean
) => {
  // インプットトップ
  const elementInput = refInput
  const inputCoordinateTop = elementInput.getBoundingClientRect().top

  // ブラウザ中心値
  const innerHeightCenter = window.innerHeight / 2

  if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 's' || inputSize === 'S') &&
    !labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがSで、ラベル等が設定されていない場合
    return '44px'
  } else if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 'm' || inputSize === 'M') &&
    !labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがMで、ラベル等が設定されていない場合
    return '49px'
  } else if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 'l' || inputSize === 'L') &&
    !labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがLで、ラベル等が設定されていない場合
    return '54px'
  } else if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 's' || inputSize === 'S') &&
    labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがSで、ラベル等が設定されている場合
    return '68px'
  } else if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 'm' || inputSize === 'M') &&
    labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがMで、ラベル等が設定されている場合
    return '73px'
  } else if (
    inputCoordinateTop < innerHeightCenter &&
    (inputSize === 'l' || inputSize === 'L') &&
    labelFlag
  ) {
    // インプットがブラウザの中心から上にあり、サイズがLで、ラベル等が設定されている場合
    return '78px'
  } else if (inputCoordinateTop > innerHeightCenter) {
    // インプットがブラウザの中心から下にある場合
    return '-395px'
  }
  return '0px'
}
