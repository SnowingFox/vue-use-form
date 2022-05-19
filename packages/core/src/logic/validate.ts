import { unref } from 'vue'
import type { FieldError } from '../types/errors'
import {
  isEmpty,
  isFunction,
  isNullOrUndefined,
  isObject,
  isRegex,
  isString,
} from '../utils'
import type { Field } from '../types/filed'
import { getValueAndMessage } from '../utils/transformMessage'
import { getValidatorError } from '../utils/getValidatorError'
import { set } from '../utils/object'

export async function validateField(
  field: Field,
  validateAllFieldCriteria: boolean,
): Promise<FieldError> {
  const inputValue = field.inputValue

  const {
    required,
    min,
    max,
    maxLength,
    minLength,
    pattern,
    validate,
    valueAsNumber,
    valueAsDate,
    setValueAs,
    shouldUnregister,
    onChange,
    onBlur,
    disabled,
    isRadio,
    isCheckBox,
  } = field.rule

  const isRadioOrCheckBox = isRadio || isCheckBox
  const unrefInputVal = unref(inputValue)
  const isEmptyValue = isEmpty(unrefInputVal)

  let error: FieldError = {}

  if (valueAsNumber) {
    set(field, 'inputValue', +unrefInputVal)
  } else if (valueAsDate) {
    set(field, 'inputValue', new Date(unrefInputVal))
  } else if (setValueAs) {
    set(field, 'inputValue', setValueAs(unrefInputVal))
  }

  if (required && !isRadioOrCheckBox) {
    const { value, message } = getValueAndMessage(required)

    if (isEmptyValue && value) {
      error = {
        type: 'required',
        message,
      }

      if (!validateAllFieldCriteria)
        return error
    }
  }

  if (!isEmptyValue && (!isNullOrUndefined(max) || !isNullOrUndefined(min))) {
    let exceedMax
    let exceedMin
    const { value: maxValue, message: maxMsg } = getValueAndMessage(max)
    const { value: minValue, message: minMsg } = getValueAndMessage(min)

    if (!isNaN(unrefInputVal)) {
      if (minValue && unrefInputVal < minValue)
        exceedMin = true
      if (maxValue && unrefInputVal > maxValue)
        exceedMax = true
    }
    else {
      if (minValue && unrefInputVal < minValue)
        exceedMin = true
      if (maxValue && unrefInputVal > maxValue)
        exceedMax = true
    }

    if (exceedMax || exceedMin) {
      error = {
        type: exceedMax ? 'max' : 'min',
        message: exceedMax ? maxMsg : minMsg,
      }

      if (!validateAllFieldCriteria)
        return error
    }
  }

  if ((maxLength || minLength) && !isEmptyValue && isString(inputValue)) {
    let exceedMax
    let exceedMin
    const { value: maxValue, message: maxMsg } = getValueAndMessage(maxLength)
    const { value: minValue, message: minMsg } = getValueAndMessage(minLength)

    if (minValue && inputValue.length <= minValue)
      exceedMin = true

    if (maxValue && inputValue.length >= maxValue)
      exceedMax = true

    if (exceedMax || exceedMin) {
      error = {
        type: exceedMax ? 'maxLength' : 'minLength',
        message: exceedMax ? maxMsg : minMsg,
      }

      return error
    }
  }

  if (pattern && !isEmptyValue && isString(inputValue)) {
    const { value: patternValue, message } = getValueAndMessage(pattern)

    if (isRegex(patternValue) && !inputValue.match(patternValue)) {
      error = {
        type: 'pattern',
        message,
      }

      if (!validateAllFieldCriteria)
        return error
    }
  }

  if (validate) {
    if (isFunction(validate)) {
      const result = await validate(unrefInputVal)

      const validateResult = getValidatorError(result)

      if (validateResult)
        error = validateResult

      if (!validateAllFieldCriteria)
        return error
    } else if (isObject(validate)) {
      for (const key in validate) {
        const result = await validate[key](unrefInputVal)

        const validateResult = getValidatorError(result, key)

        if (validateResult)
          error = validateResult

        if (!validateAllFieldCriteria)
          return error
      }
    }
  }

  return error
}

