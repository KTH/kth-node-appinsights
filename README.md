# @kth/appinsights

A wrapper for the [applicationinsights](https://www.npmjs.com/package/applicationinsights) package.

This is intended for a standard use-case only. If your app needs more options, please use the core package instead.

## Usage

Applicationinsights works by injecting code that captures telemetry from the application.
To get full tracking, this package should be initialized as soon as possible in the code.

```typescript
import { KthAppinsights } from '@kth/appinsights'

KthAppinsights.init({ name: 'app-name' })
``` 

Options
```typescript
type appinsightOptions = {
  name?: string 				// Optional. Name of the application
}
``` 

## Features

### Name and Instance name.

The if `name` is passed in the options, it will be used to set "Cloud role name" and "Cloud role instance".

### User agent on requests

If a request has the `user-agent` header set, it will be saved in the custom property `user_agent`.

### Unpack Bunyan messages

Bynyan messages (used by @kth/log) will be desctructured, and only the "msg" field kept, as all other information is duplicated on native data fields.  

Example:  
`{ name: "my-app", level: 30, msg: "the important part" }` will be reduced to just `"the important part"`.
